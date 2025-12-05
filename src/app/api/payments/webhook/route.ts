// src/app/api/payments/webhook/route.ts
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyWebhookSignature } from '@/lib/razorpay'
import { redis } from '@/lib/redis'

export async function POST(request: Request) {
  try {
    // 1. Get raw body for signature verification
    const rawBody = await request.text()
    const headersList = headers()
    const signature = headersList.get('x-razorpay-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // 2. Verify webhook signature
    const isValid = verifyWebhookSignature(rawBody, signature)
    
    if (!isValid) {
      console.error('Webhook signature verification failed')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // 3. Parse webhook payload
    const event = JSON.parse(rawBody)
    
    console.log('Webhook received:', {
      event: event.event,
      paymentId: event.payload?.payment?.entity?.id
    })

    // 4. Handle different events
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity)
        break
      
      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity)
        break
      
      default:
        console.log('Unhandled webhook event:', event.event)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentCaptured(payment: any) {
  const orderId = payment.order_id
  const paymentId = payment.id

  // Find payment record
  const paymentRecord = await prisma.payment.findUnique({
    where: { razorpayOrderId: orderId },
    include: { purchase: true }
  })

  if (!paymentRecord) {
    console.error('Payment record not found for order:', orderId)
    return
  }

  // Check if already processed
  if (paymentRecord.status === 'captured') {
    console.log('Payment already processed:', paymentId)
    return
  }

  // Update payment
  await prisma.payment.update({
    where: { id: paymentRecord.id },
    data: {
      razorpayPaymentId: paymentId,
      status: 'captured',
      method: payment.method,
      paidAt: new Date(payment.created_at * 1000),
    }
  })

  // Activate purchase if not already active
  if (paymentRecord.purchase.status !== 'active') {
    const validFrom = new Date()
    const validUntil = new Date(validFrom)
    validUntil.setFullYear(validUntil.getFullYear() + 1)

    await prisma.purchase.update({
      where: { id: paymentRecord.purchaseId },
      data: {
        status: 'active',
        validFrom,
        validUntil,
      }
    })

    // Clear cache
    await redis.del(`purchase:${paymentRecord.purchase.userId}:${paymentRecord.purchase.examId}`)

    console.log('Purchase activated via webhook:', {
      purchaseId: paymentRecord.purchaseId,
      paymentId,
    })
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(payment: any) {
  const orderId = payment.order_id

  const paymentRecord = await prisma.payment.findUnique({
    where: { razorpayOrderId: orderId }
  })

  if (!paymentRecord) {
    return
  }

  await prisma.payment.update({
    where: { id: paymentRecord.id },
    data: {
      status: 'failed',
      razorpayPaymentId: payment.id,
    }
  })

  await prisma.purchase.update({
    where: { id: paymentRecord.purchaseId },
    data: { status: 'failed' }
  })

  console.log('Payment failed:', {
    orderId,
    paymentId: payment.id,
    reason: payment.error_description
  })
}