// src/app/api/payments/verify/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyRazorpaySignature } from '@/lib/razorpay'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { verifyPaymentSchema } from '@/lib/validations/payment'
import { cache } from '@/lib/redis'

export async function POST(request: Request) {
  try {
    // 1. Authenticate
    const session = await requireAuth()
    const userId = session.user.id

    // 2. Parse and validate
    const body = await request.json()
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      purchaseId,
    } = verifyPaymentSchema.parse(body)

    // 3. Fetch purchase — include both exam and bundle relations
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        exam: {
          select: { id: true, title: true },
        },
        bundle: {
          select: { id: true, name: true },
        },
        payment: true,
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    })

    // 4. Validate purchase exists
    if (!purchase) {
      console.error('Purchase not found:', purchaseId)
      return NextResponse.json(
        { error: 'Purchase record not found' },
        { status: 404 }
      )
    }

    // 5. Authorization
    if (purchase.userId !== userId) {
      console.error('Unauthorized purchase access:', { purchaseId, userId })
      return NextResponse.json(
        { error: 'Unauthorized access to purchase' },
        { status: 403 }
      )
    }

    // 6. Determine purchase type
    const isBundle = purchase.type === 'bundle'
    const displayName = isBundle
      ? (purchase.bundle?.name ?? 'Bundle')
      : (purchase.exam?.title ?? 'Exam')

    // 7. Already verified
    if (purchase.status === 'active') {
      console.log('Payment already verified:', purchaseId)
      return NextResponse.json({
        success: true,
        message: 'Payment already verified',
        purchaseId: purchase.id,
        ...(isBundle
          ? { bundleId: purchase.bundle?.id, bundleName: purchase.bundle?.name }
          : { examId: purchase.exam?.id, examTitle: purchase.exam?.title }),
      })
    }

    // 8. Validate payment record
    if (!purchase.payment) {
      console.error('Payment record missing for purchase:', purchaseId)
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      )
    }

    // 9. Verify order ID matches
    if (purchase.payment.razorpayOrderId !== razorpayOrderId) {
      console.error('Order ID mismatch:', {
        expected: purchase.payment.razorpayOrderId,
        received: razorpayOrderId,
      })
      return NextResponse.json({ error: 'Order ID mismatch' }, { status: 400 })
    }

    // 10. Verify Razorpay signature
    const isValidSignature = verifyRazorpaySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    )

    if (!isValidSignature) {
      console.error('⚠️ PAYMENT VERIFICATION FAILED - Invalid signature:', {
        purchaseId,
        userId,
        razorpayOrderId,
        razorpayPaymentId,
        timestamp: new Date().toISOString(),
      })

      await prisma.payment.update({
        where: { id: purchase.payment.id },
        data: { status: 'failed', razorpayPaymentId },
      })

      return NextResponse.json(
        { success: false, error: 'Payment verification failed. Invalid signature.' },
        { status: 400 }
      )
    }

    // 11. Atomic update
    const result = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: purchase.payment!.id },
        data: {
          razorpayPaymentId,
          razorpaySignature,
          status: 'captured',
          paidAt: new Date(),
        },
      })

      const validFrom = new Date()

      // Bundles: lifetime (validUntil = null)
      // Single exams: 1 year
      const validUntil = isBundle
        ? null
        : (() => {
            const d = new Date(validFrom)
            d.setFullYear(d.getFullYear() + 1)
            return d
          })()

      const updatedPurchase = await tx.purchase.update({
        where: { id: purchaseId },
        data: { status: 'active', validFrom, validUntil },
      })

      return { updatedPayment, updatedPurchase, validUntil }
    })

    // 12. Clear relevant cache
    if (isBundle && purchase.bundleId) {
      await cache.del(`bundle:${userId}:${purchase.bundleId}`)
    } else if (purchase.examId) {
      await cache.del(`purchase:${userId}:${purchase.examId}`)
      await cache.delPattern(`exam:${purchase.examId}:*`)
    }

    // 13. Log success
    console.log('✅ Payment verified successfully:', {
      purchaseId,
      userId,
      type: purchase.type,
      displayName,
      amount: purchase.price,
      razorpayPaymentId,
      userEmail: purchase.user.email,
      timestamp: new Date().toISOString(),
    })

    // 14. Return success — shape differs by type
    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      purchaseId: purchase.id,
      amount: purchase.price,
      ...(isBundle
        ? {
            bundleId:   purchase.bundle?.id,
            bundleName: purchase.bundle?.name,
            validUntil: null,
          }
        : {
            examId:    purchase.exam?.id,
            examTitle: purchase.exam?.title,
            validUntil: result.validUntil?.toISOString(),
          }),
    })
  } catch (error) {
    console.error('Payment verification error:', error)
    return handleApiError(error)
  }
}