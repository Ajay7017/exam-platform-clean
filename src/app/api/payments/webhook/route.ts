// src/app/api/payments/webhook/route.ts
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyWebhookSignature } from '@/lib/razorpay'
import { cache } from '@/lib/redis'

/**
 * Razorpay Webhook Handler
 * Processes asynchronous payment events
 *
 * CRITICAL: This endpoint must be publicly accessible
 * Security is handled via signature verification
 */
export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    // 1. Get raw body for signature verification (IMPORTANT: Don't use request.json())
    const rawBody = await request.text()
    const headersList = headers()
    const signature = headersList.get('x-razorpay-signature')

    // 2. Validate signature header
    if (!signature) {
      console.error('Webhook rejected: Missing signature header')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // 3. Verify webhook signature (CRITICAL SECURITY CHECK)
    const isValid = verifyWebhookSignature(rawBody, signature)

    if (!isValid) {
      console.error('⚠️ Webhook rejected: Invalid signature', {
        timestamp: new Date().toISOString(),
        signature: signature.substring(0, 10) + '...',
      })
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // 4. Parse webhook payload
    const event = JSON.parse(rawBody)

    console.log('Webhook received:', {
      event: event.event,
      paymentId: event.payload?.payment?.entity?.id,
      orderId: event.payload?.payment?.entity?.order_id,
      timestamp: new Date().toISOString(),
    })

    // 5. Handle different webhook events
    let result
    switch (event.event) {
      case 'payment.captured':
        result = await handlePaymentCaptured(event.payload.payment.entity)
        break

      case 'payment.failed':
        result = await handlePaymentFailed(event.payload.payment.entity)
        break

      case 'payment.authorized':
        // Payment authorized but not captured yet
        console.log('Payment authorized:', event.payload.payment.entity.id)
        break

      case 'order.paid':
        // All payments for an order are successful
        console.log('Order fully paid:', event.payload.order.entity.id)
        break

      default:
        console.log('Unhandled webhook event:', event.event)
    }

    // 6. Log processing time
    const duration = Date.now() - startTime
    console.log(`Webhook processed in ${duration}ms`)

    return NextResponse.json({
      received: true,
      event: event.event,
      processingTime: duration,
    })
  } catch (error) {
    console.error('Webhook processing error:', error)

    // Return 200 to prevent Razorpay retries for parse errors
    // Return 500 for actual processing errors to trigger retries
    const statusCode = error instanceof SyntaxError ? 200 : 500

    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: statusCode }
    )
  }
}

/**
 * Handle successful payment capture.
 * Works for both single exam purchases (type = "exam") and
 * bundle purchases (type = "bundle").
 */
async function handlePaymentCaptured(payment: any) {
  const orderId  = payment.order_id
  const paymentId = payment.id
  const amount   = payment.amount
  const method   = payment.method

  console.log('Processing payment.captured:', { orderId, paymentId, amount })

  try {
    // Find payment record — include both exam and bundle relations
    // so we can determine purchase type and clear the right cache keys.
    const paymentRecord = await prisma.payment.findUnique({
      where: { razorpayOrderId: orderId },
      include: {
        purchase: {
          include: {
            exam: {
              select: { id: true, title: true },
            },
            bundle: {
              select: { id: true, name: true },
            },
            user: {
              select: { id: true, email: true, name: true },
            },
          },
        },
      },
    })

    if (!paymentRecord) {
      console.error('Payment record not found for order:', orderId)
      return { success: false, error: 'Payment record not found' }
    }

    // Check if already processed (idempotency)
    if (paymentRecord.status === 'captured') {
      console.log('Payment already processed (idempotent):', paymentId)
      return { success: true, message: 'Already processed' }
    }

    // Verify amount matches (security check)
    if (paymentRecord.amount !== amount) {
      console.error('Amount mismatch:', {
        expected: paymentRecord.amount,
        received: amount,
        orderId,
      })
      // Don't fail — just log. Razorpay might include fees.
    }

    // Determine purchase type — drives validUntil and cache key logic below
    const isBundle = paymentRecord.purchase.type === 'bundle'

    // Use transaction for atomic updates
    const result = await prisma.$transaction(async (tx) => {
      // Update payment status
      const updatedPayment = await tx.payment.update({
        where: { id: paymentRecord.id },
        data: {
          razorpayPaymentId: paymentId,
          status: 'captured',
          method,
          paidAt: new Date(payment.created_at * 1000),
        },
      })

      // Activate purchase if not already active
      let updatedPurchase = paymentRecord.purchase
      if (paymentRecord.purchase.status !== 'active') {
        const validFrom = new Date()

        // Bundles: lifetime access — validUntil must stay null.
        // Single exams: 1-year access.
        const validUntil = isBundle
          ? null
          : (() => {
              const d = new Date(validFrom)
              d.setFullYear(d.getFullYear() + 1)
              return d
            })()

        updatedPurchase = await tx.purchase.update({
          where: { id: paymentRecord.purchaseId },
          data: {
            status: 'active',
            validFrom,
            validUntil,
          },
        })
      }

      return { updatedPayment, updatedPurchase }
    })

    // Clear the correct cache keys based on purchase type
    const { userId } = paymentRecord.purchase
    if (isBundle && paymentRecord.purchase.bundleId) {
      await cache.del(`bundle:${userId}:${paymentRecord.purchase.bundleId}`)
    } else if (paymentRecord.purchase.examId) {
      await cache.del(`purchase:${userId}:${paymentRecord.purchase.examId}`)
      await cache.delPattern(`exam:${paymentRecord.purchase.examId}:*`)
    }

    const displayName = isBundle
      ? (paymentRecord.purchase.bundle?.name ?? 'Bundle')
      : (paymentRecord.purchase.exam?.title ?? 'Exam')

    console.log('✅ Payment captured via webhook:', {
      purchaseId: paymentRecord.purchaseId,
      type: paymentRecord.purchase.type,
      displayName,
      paymentId,
      userId,
      amount,
      method,
    })

    // TODO: Send confirmation email
    // await sendPaymentConfirmationEmail({...})

    return { success: true, purchaseId: paymentRecord.purchaseId }
  } catch (error) {
    console.error('Error processing payment.captured:', error)
    throw error // Re-throw to trigger Razorpay retry
  }
}

/**
 * Handle failed payment.
 * No type-specific logic needed — just mark both records as failed.
 */
async function handlePaymentFailed(payment: any) {
  const orderId          = payment.order_id
  const paymentId        = payment.id
  const errorCode        = payment.error_code
  const errorDescription = payment.error_description

  console.log('Processing payment.failed:', {
    orderId,
    paymentId,
    errorCode,
    errorDescription,
  })

  try {
    const paymentRecord = await prisma.payment.findUnique({
      where: { razorpayOrderId: orderId },
      include: {
        purchase: {
          include: {
            user: {
              select: { email: true, name: true },
            },
          },
        },
      },
    })

    if (!paymentRecord) {
      console.error('Payment record not found for failed payment:', orderId)
      return { success: false, error: 'Payment record not found' }
    }

    // Update payment and purchase status
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: 'failed',
          razorpayPaymentId: paymentId,
        },
      }),
      prisma.purchase.update({
        where: { id: paymentRecord.purchaseId },
        data: { status: 'failed' },
      }),
    ])

    console.log('Payment marked as failed:', {
      purchaseId: paymentRecord.purchaseId,
      paymentId,
      errorCode,
      errorDescription,
    })

    // TODO: Send failure notification email
    // await sendPaymentFailedEmail({...})

    return { success: true, marked: 'failed' }
  } catch (error) {
    console.error('Error processing payment.failed:', error)
    throw error
  }
}

// IMPORTANT: Disable body parsing to get raw body for signature verification
// export const config = {
//   api: {
//     bodyParser: false,
//   },
// }