// src/app/api/payments/create-order/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { razorpay, getRazorpayPublicKey, validatePaymentAmount, isTestMode } from '@/lib/razorpay'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { createOrderSchema } from '@/lib/validations/payment'

// Helper: fetch a Razorpay order and return it only if still unpaid.
// Returns null if the order is paid, expired, or not found.
// Cast to `any` because the Razorpay SDK types don't expose `status` on Orders.
async function fetchReusableOrder(orderId: string): Promise<{ id: string; amount: number } | null> {
  try {
    const order = await (razorpay.orders.fetch as (id: string) => Promise<any>)(orderId)
    if (order?.status === 'created') {
      return { id: order.id as string, amount: order.amount as number }
    }
    return null
  } catch {
    // Order not found on Razorpay or network error — fall through to create new
    return null
  }
}

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

      // Already purchased (active)
      const existingActivePurchase = await prisma.purchase.findFirst({
        where: {
          userId,
          bundleId,
          status: 'active',
          OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
        },
      })

      if (existingActivePurchase) {
        return NextResponse.json({
          success: true,
          alreadyOwned: true,
          purchaseId: existingActivePurchase.id,
          message: 'You already own this bundle',
        })
      }

      // ── CRITICAL FIX: Reuse existing pending purchase+order ──────────────
      // Prevents duplicate Purchase/Payment records when user dismisses modal
      // and clicks Buy again. We find the most recent pending record and check
      // if its Razorpay order is still open before creating a new one.
      const pendingBundlePurchase = await prisma.purchase.findFirst({
        where: { userId, bundleId, status: 'pending' },
        include: { payment: true },
        orderBy: { createdAt: 'desc' },
      })

      // razorpayOrderId is String? in schema — extract safely before using
      const pendingBundleOrderId: string | null =
        pendingBundlePurchase?.payment?.razorpayOrderId ?? null

      if (pendingBundleOrderId) {
        const reusable = await fetchReusableOrder(pendingBundleOrderId)
        if (reusable && pendingBundlePurchase?.payment) {
          console.log('[CREATE-ORDER] Reusing existing pending bundle order:', {
            purchaseId: pendingBundlePurchase.id,
            orderId: reusable.id,
            userId,
            bundleId,
          })
          return NextResponse.json({
            success: true,
            orderId: reusable.id,
            amount: pendingBundlePurchase.payment.amount,
            currency: 'INR',
            key: getRazorpayPublicKey(),
            purchaseId: pendingBundlePurchase.id,
            bundleName: bundle.name,
            isTestMode,
          })
        }
      }

      // Create new purchase + Razorpay order
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
          validUntil: null,
        },
      })

      try {
        const razorpayOrder = await (razorpay.orders.create as (opts: any) => Promise<any>)({
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
        })

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
        console.error('[CREATE-ORDER] Razorpay bundle order creation failed:', razorpayError)
        return NextResponse.json(
          { error: 'Failed to create payment order. Please try again.' },
          { status: 500 }
        )
      }
    }

    // ── SINGLE EXAM flow ──────────────────────────────────────────────────
    const { examId } = body

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

    // Check direct active purchase
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

    // Check bundle ownership
    const bundleAccess = await prisma.purchase.findFirst({
      where: {
        userId,
        type: 'bundle',
        status: 'active',
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
        bundle: { exams: { some: { examId } } },
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

    // Free exam enrollment
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

    // ── CRITICAL FIX: Reuse existing pending exam purchase+order ──────────
    const pendingExamPurchase = await prisma.purchase.findFirst({
      where: { userId, examId, status: 'pending' },
      include: { payment: true },
      orderBy: { createdAt: 'desc' },
    })

    // razorpayOrderId is String? in schema — extract safely before using
    const pendingExamOrderId: string | null =
      pendingExamPurchase?.payment?.razorpayOrderId ?? null

    if (pendingExamOrderId) {
      const reusable = await fetchReusableOrder(pendingExamOrderId)
      if (reusable && pendingExamPurchase?.payment) {
        console.log('[CREATE-ORDER] Reusing existing pending exam order:', {
          purchaseId: pendingExamPurchase.id,
          orderId: reusable.id,
          userId,
          examId,
        })
        return NextResponse.json({
          success: true,
          orderId: reusable.id,
          amount: pendingExamPurchase.payment.amount,
          currency: 'INR',
          key: getRazorpayPublicKey(),
          purchaseId: pendingExamPurchase.id,
          examTitle: exam.title,
          examSubject: exam.subject?.name || 'General',
          isTestMode,
        })
      }
    }

    // Paid exam — create new Razorpay order
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
      const razorpayOrder = await (razorpay.orders.create as (opts: any) => Promise<any>)({
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
      })

      await prisma.payment.create({
        data: {
          purchaseId: purchase.id,
          razorpayOrderId: razorpayOrder.id,
          amount: exam.price,
          currency: 'INR',
          status: 'created',
        },
      })

      console.log('[CREATE-ORDER] Razorpay order created:', {
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
      console.error('[CREATE-ORDER] Razorpay order creation failed:', {
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
    console.error('[CREATE-ORDER] ERROR:', error)
    return handleApiError(error)
  }
}