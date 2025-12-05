// src/app/api/payments/create-order/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { razorpay, rupeesToPaise } from '@/lib/razorpay'
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
        { error: 'You already own this exam' },
        { status: 400 }
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
          type: 'exam', // ADDED: Required by your schema
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        }
      })

      return NextResponse.json({
        success: true,
        isFree: true,
        purchaseId: purchase.id,
        message: 'Exam enrolled successfully'
      })
    }

    // 7. Create pending purchase record
    const purchase = await prisma.purchase.create({
      data: {
        userId,
        examId,
        price: exam.price,
        status: 'pending',
        type: 'exam', // ADDED: Required by your schema
      }
    })

    // 8. Create Razorpay order
    // Ensure amount is integer (paise)
    const amountInPaise = exam.price

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise, 
      currency: 'INR',
      receipt: purchase.id,
      notes: {
        purchaseId: purchase.id,
        examId: exam.id,
        userId: userId,
        examName: exam.title.substring(0, 30),
      }
    })

    // 9. Save Razorpay order ID
    await prisma.payment.create({
      data: {
        purchaseId: purchase.id,
        razorpayOrderId: razorpayOrder.id,
        amount: exam.price,
        currency: 'INR',
        status: 'created',
      }
    })

    // 10. Return order details for frontend
    return NextResponse.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID,
      purchaseId: purchase.id,
      examTitle: exam.title,
      examSubject: exam.subject?.name || 'General',
    })

  } catch (error) {
    console.error("PAYMENT API ERROR:", error)
    return handleApiError(error)
  }
}