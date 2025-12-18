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

    // 3. Fetch purchase record with related data
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
          }
        },
        payment: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    })

    // 4. Validate purchase record
    if (!purchase) {
      console.error('Purchase not found:', purchaseId)
      return NextResponse.json(
        { error: 'Purchase record not found' },
        { status: 404 }
      )
    }

    // 5. Authorization check
    if (purchase.userId !== userId) {
      console.error('Unauthorized purchase access:', {
        purchaseId,
        userId,
        purchaseUserId: purchase.userId
      })
      return NextResponse.json(
        { error: 'Unauthorized access to purchase' },
        { status: 403 }
      )
    }

    // 6. Check if already verified
    if (purchase.status === 'active') {
      console.log('Payment already verified:', purchaseId)
      return NextResponse.json({
        success: true,
        message: 'Payment already verified',
        purchaseId: purchase.id,
        examId: purchase.exam.id,
        examTitle: purchase.exam.title,
      })
    }

    // 7. Validate payment record exists
    if (!purchase.payment) {
      console.error('Payment record missing for purchase:', purchaseId)
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      )
    }

    // 8. Verify order ID matches
    if (purchase.payment.razorpayOrderId !== razorpayOrderId) {
      console.error('Order ID mismatch:', {
        expected: purchase.payment.razorpayOrderId,
        received: razorpayOrderId
      })
      return NextResponse.json(
        { error: 'Order ID mismatch' },
        { status: 400 }
      )
    }

    // 9. CRITICAL: Verify Razorpay signature
    const isValidSignature = verifyRazorpaySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    )

    if (!isValidSignature) {
      // Log security event
      console.error('⚠️ PAYMENT VERIFICATION FAILED - Invalid signature:', {
        purchaseId,
        userId,
        razorpayOrderId,
        razorpayPaymentId,
        timestamp: new Date().toISOString()
      })

      // Mark payment as failed
      await prisma.payment.update({
        where: { id: purchase.payment.id },
        data: {
          status: 'failed',
          razorpayPaymentId,
        }
      })

      return NextResponse.json(
        { 
          success: false,
          error: 'Payment verification failed. Invalid signature.' 
        },
        { status: 400 }
      )
    }

    // 10. Use transaction for atomic updates
    const result = await prisma.$transaction(async (tx) => {
      // Update payment record
      const updatedPayment = await tx.payment.update({
        where: { id: purchase.payment!.id },
        data: {
          razorpayPaymentId,
          razorpaySignature,
          status: 'captured',
          paidAt: new Date(),
        }
      })

      // Calculate validity period
      const validFrom = new Date()
      const validUntil = new Date(validFrom)
      validUntil.setFullYear(validUntil.getFullYear() + 1) // Valid for 1 year

      // Activate purchase
      const updatedPurchase = await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          status: 'active',
          validFrom,
          validUntil,
        }
      })

      return { updatedPayment, updatedPurchase, validUntil }
    })

    // 11. Clear cache for purchase status
    await cache.del(`purchase:${userId}:${purchase.examId}`)
    await cache.delPattern(`exam:${purchase.examId}:*`)

    // 12. Log successful verification
    console.log('✅ Payment verified successfully:', {
      purchaseId,
      userId,
      examId: purchase.examId,
      examTitle: purchase.exam.title,
      amount: purchase.price,
      razorpayPaymentId,
      userEmail: purchase.user.email,
      timestamp: new Date().toISOString()
    })

    // 13. TODO: Send confirmation email (implement in production)
    // await sendPaymentConfirmationEmail({
    //   to: purchase.user.email,
    //   name: purchase.user.name,
    //   examTitle: purchase.exam.title,
    //   amount: purchase.price,
    //   purchaseId
    // })

    // 14. Return success response
    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      purchaseId: purchase.id,
      examId: purchase.exam.id,
      examTitle: purchase.exam.title,
      validUntil: result.validUntil.toISOString(),
      amount: purchase.price,
    })

  } catch (error) {
    console.error('Payment verification error:', error)
    return handleApiError(error)
  }
}