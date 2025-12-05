// src/app/api/payments/verify/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyRazorpaySignature } from '@/lib/razorpay'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { verifyPaymentSchema } from '@/lib/validations/payment'
import { redis } from '@/lib/redis'

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const session = await requireAuth()
    const userId = session.user.id

    // 2. Parse and validate request
    const body = await request.json()
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      purchaseId
    } = verifyPaymentSchema.parse(body)

    // 3. Fetch purchase record
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
          }
        },
        payment: true
      }
    })

    // 4. Validate purchase
    if (!purchase) {
      return NextResponse.json(
        { error: 'Purchase record not found' },
        { status: 404 }
      )
    }

    if (purchase.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized access to purchase' },
        { status: 403 }
      )
    }

    if (purchase.status === 'active') {
      return NextResponse.json(
        { error: 'Payment already verified' },
        { status: 400 }
      )
    }

    if (!purchase.payment) {
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      )
    }

    // 5. CRITICAL: Verify Razorpay signature
    const isValidSignature = verifyRazorpaySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    )

    if (!isValidSignature) {
      // Log failed verification attempt
      console.error('Payment verification failed:', {
        purchaseId,
        userId,
        razorpayOrderId,
        razorpayPaymentId
      })

      return NextResponse.json(
        { error: 'Payment verification failed. Invalid signature.' },
        { status: 400 }
      )
    }

    // 6. Update payment record
    await prisma.payment.update({
      where: { id: purchase.payment.id },
      data: {
        razorpayPaymentId,
        razorpaySignature,
        status: 'captured',
        method: 'online', // Can be extracted from Razorpay payment details
        paidAt: new Date(),
      }
    })

    // 7. Activate purchase
    const validFrom = new Date()
    const validUntil = new Date(validFrom)
    validUntil.setFullYear(validUntil.getFullYear() + 1) // Valid for 1 year

    await prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        status: 'active',
        validFrom,
        validUntil,
      }
    })

    // 8. Clear cache for purchase status
    await redis.del(`purchase:${userId}:${purchase.examId}`)

    // 9. Log successful payment
    console.log('Payment verified successfully:', {
      purchaseId,
      userId,
      examId: purchase.examId,
      amount: purchase.price,
      razorpayPaymentId
    })

    // 10. Return success response
    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      purchaseId: purchase.id,
      examId: purchase.exam.id,
      examTitle: purchase.exam.title,
      validUntil: validUntil.toISOString(),
    })

  } catch (error) {
    return handleApiError(error)
  }
}