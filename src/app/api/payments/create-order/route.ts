// src/app/api/payments/create-order/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { razorpay, getRazorpayPublicKey, validatePaymentAmount, isTestMode } from '@/lib/razorpay'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { createOrderSchema } from '@/lib/validations/payment'

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const session = await requireAuth()
    const userId = session.user.id

    // 2. Parse and validate request
    const body = await request.json()
    const { examId } = createOrderSchema.parse(body)

    // 3. Fetch exam details
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        subject: {
          select: { name: true }
        }
      }
    })

    // 4. Validate exam exists and is published
    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      )
    }

    if (!exam.isPublished) {
      return NextResponse.json(
        { error: 'Exam is not available for purchase' },
        { status: 400 }
      )
    }

    // 5. Check if already purchased
    const existingPurchase = await prisma.purchase.findFirst({
      where: {
        userId,
        examId,
        status: 'active',
        validUntil: { gte: new Date() }
      }
    })

    if (existingPurchase) {
      return NextResponse.json(
        { 
          success: true,
          isFree: true,
          alreadyOwned: true,
          purchaseId: existingPurchase.id,
          message: 'You already own this exam'
        },
        { status: 200 }
      )
    }

    // 6. Handle free exams
    if (exam.isFree || exam.price === 0) {
      const purchase = await prisma.purchase.create({
        data: {
          userId,
          examId,
          price: 0,
          status: 'active',
          type: 'exam',
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        }
      })

      console.log('Free exam enrolled:', {
        purchaseId: purchase.id,
        userId,
        examId,
        examTitle: exam.title
      })

      return NextResponse.json({
        success: true,
        isFree: true,
        purchaseId: purchase.id,
        message: 'Exam enrolled successfully'
      })
    }

    // 7. Validate payment amount
    const amountInPaise = exam.price

    if (!validatePaymentAmount(amountInPaise)) {
      return NextResponse.json(
        { error: 'Invalid payment amount' },
        { status: 400 }
      )
    }

    // 8. Create pending purchase record with idempotency
    const purchase = await prisma.purchase.create({
      data: {
        userId,
        examId,
        price: exam.price,
        status: 'pending',
        type: 'exam',
      }
    })

    // 9. Create Razorpay order
    try {
      const razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise, 
        currency: 'INR',
        receipt: purchase.id,
        notes: {
          purchaseId: purchase.id,
          examId: exam.id,
          userId: userId,
          examName: exam.title.substring(0, 30),
          environment: process.env.NODE_ENV || 'development'
        },
        // Payment capture settings
        payment_capture: 1, // Auto-capture
      })

      // 10. Save Razorpay order ID
      await prisma.payment.create({
        data: {
          purchaseId: purchase.id,
          razorpayOrderId: razorpayOrder.id,
          amount: exam.price,
          currency: 'INR',
          status: 'created',
        }
      })

      // 11. Log order creation (important for debugging)
      console.log('Razorpay order created:', {
        orderId: razorpayOrder.id,
        purchaseId: purchase.id,
        amount: amountInPaise,
        userId,
        examId,
        mode: isTestMode ? 'TEST' : 'LIVE'
      })

      // 12. Return order details for frontend
      return NextResponse.json({
        success: true,
        orderId: razorpayOrder.id,
        amount: amountInPaise,
        currency: 'INR',
        key: getRazorpayPublicKey(), // Use safe getter
        purchaseId: purchase.id,
        examTitle: exam.title,
        examSubject: exam.subject?.name || 'General',
        isTestMode, // Let frontend know if in test mode
      })

    } catch (razorpayError: any) {
      // Handle Razorpay API errors
      console.error('Razorpay order creation failed:', {
        error: razorpayError.message,
        purchaseId: purchase.id,
        userId,
        examId
      })

      // Mark purchase as failed
      await prisma.purchase.update({
        where: { id: purchase.id },
        data: { status: 'failed' }
      })

      return NextResponse.json(
        { 
          error: 'Failed to create payment order. Please try again.',
          details: process.env.NODE_ENV === 'development' ? razorpayError.message : undefined
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("CREATE ORDER ERROR:", error)
    return handleApiError(error)
  }
}

// Add request configuration for body parsing
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}