// src/lib/validations/payment.ts
import { z } from 'zod'

export const createOrderSchema = z.object({
  examId: z.string().cuid('Invalid exam ID'),
  type: z.enum(['single_exam']).default('single_exam'),
})

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1, 'Order ID is required'),
  razorpayPaymentId: z.string().min(1, 'Payment ID is required'),
  razorpaySignature: z.string().min(1, 'Signature is required'),
  purchaseId: z.string().cuid('Invalid purchase ID'),
})

export const webhookEventSchema = z.object({
  event: z.string(),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string(),
        order_id: z.string(),
        status: z.string(),
        amount: z.number(),
      }),
    }),
  }),
})