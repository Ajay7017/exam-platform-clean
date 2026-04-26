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
    const session = await requireAuth()
    const userId = session.user.id

    const body = await request.json()
    console.log('[VERIFY] Request received:', {
      userId,
      purchaseId: body.purchaseId,
      razorpayOrderId: body.razorpayOrderId,
      razorpayPaymentId: body.razorpayPaymentId,
      timestamp: new Date().toISOString(),
    })

    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      purchaseId,
    } = verifyPaymentSchema.parse(body)

    // Fetch purchase with singular payment relation (matches schema: payment Payment?)
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        exam: { select: { id: true, title: true } },
        bundle: { select: { id: true, name: true } },
        payment: true,
        user: { select: { id: true, email: true, name: true } },
      },
    })

    if (!purchase) {
      console.error('[VERIFY] Purchase not found:', purchaseId)
      return NextResponse.json({ error: 'Purchase record not found' }, { status: 404 })
    }

    if (purchase.userId !== userId) {
      console.error('[VERIFY] Unauthorized:', { purchaseId, userId })
      return NextResponse.json({ error: 'Unauthorized access to purchase' }, { status: 403 })
    }

    const isBundle = purchase.type === 'bundle'

    // Already verified — idempotent
    if (purchase.status === 'active') {
      console.log('[VERIFY] Already verified (idempotent):', purchaseId)
      return NextResponse.json({
        success: true,
        message: 'Payment already verified',
        purchaseId: purchase.id,
        ...(isBundle
          ? { bundleId: purchase.bundle?.id, bundleName: purchase.bundle?.name }
          : { examId: purchase.exam?.id, examTitle: purchase.exam?.title }),
      })
    }

    if (!purchase.payment) {
      console.error('[VERIFY] Payment record missing:', purchaseId)
      return NextResponse.json(
        { error: 'Payment record not found. Please contact support.' },
        { status: 404 }
      )
    }

    // CRITICAL FIX: If order ID doesn't match (edge case from duplicate
    // create-order calls before our fix), look up by razorpayOrderId directly.
    // After deploying create-order fix, this fallback will rarely be needed.
    let paymentRecord = purchase.payment

    if (paymentRecord.razorpayOrderId !== razorpayOrderId) {
      console.warn('[VERIFY] Order ID mismatch on primary record, trying direct lookup:', {
        expected: paymentRecord.razorpayOrderId,
        received: razorpayOrderId,
        purchaseId,
      })

      const directPayment = await prisma.payment.findUnique({
        where: { razorpayOrderId },
      })

      if (!directPayment || directPayment.purchaseId !== purchaseId) {
        console.error('[VERIFY] No matching payment found for order:', {
          razorpayOrderId,
          purchaseId,
        })
        return NextResponse.json(
          { error: 'Order ID mismatch. Please contact support.' },
          { status: 400 }
        )
      }

      paymentRecord = directPayment
    }

    // Verify Razorpay signature
    const isValidSignature = verifyRazorpaySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    )

    if (!isValidSignature) {
      console.error('[VERIFY] ⚠️ Invalid signature:', {
        purchaseId,
        userId,
        razorpayOrderId,
        razorpayPaymentId,
        timestamp: new Date().toISOString(),
      })

      await prisma.payment.update({
        where: { id: paymentRecord.id },
        data: { status: 'failed', razorpayPaymentId },
      })

      return NextResponse.json(
        { success: false, error: 'Payment verification failed. Invalid signature.' },
        { status: 400 }
      )
    }

    // Atomic update
    const result = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: paymentRecord.id },
        data: {
          razorpayPaymentId,
          razorpaySignature,
          status: 'captured',
          paidAt: new Date(),
        },
      })

      const validFrom = new Date()
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

    // Cache invalidation — isolated so Redis failures never break verify
    try {
      if (isBundle && purchase.bundleId) {
        await cache.del(`bundle:${userId}:${purchase.bundleId}`)
      } else if (purchase.examId) {
        await cache.del(`purchase:${userId}:${purchase.examId}`)
        await cache.delPattern(`exam:${purchase.examId}:*`)
      }
    } catch (cacheError) {
      console.error('[VERIFY] Cache invalidation failed (non-fatal):', cacheError)
    }

    console.log('[VERIFY] ✅ Payment verified successfully:', {
      purchaseId,
      userId,
      type: purchase.type,
      amount: purchase.price,
      razorpayPaymentId,
      userEmail: purchase.user.email,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      purchaseId: purchase.id,
      amount: purchase.price,
      ...(isBundle
        ? {
            bundleId: purchase.bundle?.id,
            bundleName: purchase.bundle?.name,
            validUntil: null,
          }
        : {
            examId: purchase.exam?.id,
            examTitle: purchase.exam?.title,
            validUntil: result.validUntil?.toISOString(),
          }),
    })
  } catch (error) {
    console.error('[VERIFY] Payment verification error:', error)
    return handleApiError(error)
  }
}