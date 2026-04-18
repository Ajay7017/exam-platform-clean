// src/app/api/payments/create-order/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { razorpay, getRazorpayPublicKey, validatePaymentAmount, isTestMode } from '@/lib/razorpay'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'

import { createOrderSchema } from '@/lib/validations/payment'

// ── handler ────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const body = createOrderSchema.parse(await request.json())

    // ── BUNDLE flow ────────────────────────────────────────────────────────
    if (body.type === 'bundle') {
      const { bundleId } = body

      const bundle = await prisma.bundle.findUnique({
        where: { id: bundleId },
      })

      if (!bundle || !bundle.isActive) {
        return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
      }

      // Check already purchased
      const existingPurchase = await prisma.purchase.findFirst({
        where: {
          userId,
          bundleId,
          status: 'active',
          OR: [
            { validUntil: null },
            { validUntil: { gte: new Date() } },
          ],
        },
      })

      if (existingPurchase) {
        return NextResponse.json({
          success: true,
          alreadyOwned: true,
          purchaseId: existingPurchase.id,
          message: 'You already own this bundle',
        })
      }

      // Calculate final price
      const discountAmount = Math.round(bundle.price * (bundle.discount / 100))
      const finalPrice = bundle.price - discountAmount

      if (!validatePaymentAmount(finalPrice)) {
        return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 })
      }

      const purchase = await prisma.purchase.create({
        data: {
          userId,
          bundleId,
          price: finalPrice,
          status: 'pending',
          type: 'bundle',
          validFrom: new Date(),
          validUntil: null,   // lifetime access — bundles never expire
        },
      })

      try {
        const razorpayOrder = await razorpay.orders.create({
          amount: finalPrice,
          currency: 'INR',
          receipt: purchase.id,
          notes: {
            purchaseId: purchase.id,
            bundleId: bundle.id,
            userId,
            bundleName: bundle.name.substring(0, 30),
            environment: process.env.NODE_ENV || 'development',
          },
        } as any)

        await prisma.payment.create({
          data: {
            purchaseId: purchase.id,
            razorpayOrderId: razorpayOrder.id,
            amount: finalPrice,
            currency: 'INR',
            status: 'created',
          },
        })

        return NextResponse.json({
          success: true,
          orderId: razorpayOrder.id,
          amount: finalPrice,
          currency: 'INR',
          key: getRazorpayPublicKey(),
          purchaseId: purchase.id,
          bundleName: bundle.name,
          isTestMode,
        })
      } catch (razorpayError: any) {
        await prisma.purchase.update({
          where: { id: purchase.id },
          data: { status: 'failed' },
        })
        console.error('Razorpay bundle order creation failed:', razorpayError)
        return NextResponse.json(
          { error: 'Failed to create payment order. Please try again.' },
          { status: 500 }
        )
      }
    }

    // ── SINGLE EXAM flow ──────────────────────────────────────────────────
    const { examId } = body  // TypeScript now knows body.type === 'single_exam'

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { subject: { select: { name: true } } },
    })

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    if (!exam.isPublished) {
      return NextResponse.json(
        { error: 'Exam is not available for purchase' },
        { status: 400 }
      )
    }

    const now = new Date()

    // ── 1. Direct exam purchase check ─────────────────────────────────────
    const existingPurchase = await prisma.purchase.findFirst({
      where: {
        userId,
        examId,
        status: 'active',
        validUntil: { gte: now },
      },
    })

    if (existingPurchase) {
      return NextResponse.json({
        success: true,
        alreadyOwned: true,
        purchaseId: existingPurchase.id,
        message: 'You already own this exam',
      })
    }

    // ── 2. Bundle ownership check ─────────────────────────────────────────
    // Student may already have access to this exam via a purchased bundle.
    // If so, block the order creation — no financial harm intended, but
    // prevents dangling pending records and eliminates any double-pay risk.
    const bundleAccess = await prisma.purchase.findFirst({
      where: {
        userId,
        type: 'bundle',
        status: 'active',
        OR: [
          { validUntil: null },
          { validUntil: { gte: now } },
        ],
        bundle: {
          exams: {
            some: { examId },
          },
        },
      },
    })

    if (bundleAccess) {
      return NextResponse.json({
        success: true,
        alreadyOwned: true,
        purchaseId: bundleAccess.id,
        message: 'You already have access to this exam via a bundle',
      })
    }

    // ── 3. Free exam enrollment ───────────────────────────────────────────
    if (exam.isFree || exam.price === 0) {
      const purchase = await prisma.purchase.create({
        data: {
          userId,
          examId,
          price: 0,
          status: 'active',
          type: 'exam',
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      })

      return NextResponse.json({
        success: true,
        isFree: true,
        purchaseId: purchase.id,
        message: 'Exam enrolled successfully',
      })
    }

    // ── 4. Paid exam — create Razorpay order ──────────────────────────────
    const amountInPaise = exam.price

    if (!validatePaymentAmount(amountInPaise)) {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 })
    }

    const purchase = await prisma.purchase.create({
      data: {
        userId,
        examId,
        price: exam.price,
        status: 'pending',
        type: 'exam',
      },
    })

    try {
      const razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: purchase.id,
        notes: {
          purchaseId: purchase.id,
          examId: exam.id,
          userId,
          examName: exam.title.substring(0, 30),
          environment: process.env.NODE_ENV || 'development',
        },
      } as any)

      await prisma.payment.create({
        data: {
          purchaseId: purchase.id,
          razorpayOrderId: razorpayOrder.id,
          amount: exam.price,
          currency: 'INR',
          status: 'created',
        },
      })

      console.log('Razorpay order created:', {
        orderId: razorpayOrder.id,
        purchaseId: purchase.id,
        amount: amountInPaise,
        userId,
        examId,
        mode: isTestMode ? 'TEST' : 'LIVE',
      })

      return NextResponse.json({
        success: true,
        orderId: razorpayOrder.id,
        amount: amountInPaise,
        currency: 'INR',
        key: getRazorpayPublicKey(),
        purchaseId: purchase.id,
        examTitle: exam.title,
        examSubject: exam.subject?.name || 'General',
        isTestMode,
      })
    } catch (razorpayError: any) {
      console.error('Razorpay order creation failed:', {
        error: razorpayError.message,
        purchaseId: purchase.id,
        userId,
        examId,
      })

      await prisma.purchase.update({
        where: { id: purchase.id },
        data: { status: 'failed' },
      })

      return NextResponse.json(
        {
          error: 'Failed to create payment order. Please try again.',
          details:
            process.env.NODE_ENV === 'development' ? razorpayError.message : undefined,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('CREATE ORDER ERROR:', error)
    return handleApiError(error)
  }
}