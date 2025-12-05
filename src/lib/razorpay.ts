// src/lib/razorpay.ts
import Razorpay from 'razorpay'
import crypto from 'crypto'

// Initialize Razorpay instance
export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

/**
 * Verify Razorpay payment signature
 * CRITICAL: This prevents payment fraud
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const text = `${orderId}|${paymentId}`
  const generated = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(text)
    .digest('hex')
  
  return generated === signature
}

/**
 * Verify webhook signature
 * Used for webhook endpoint security
 */
export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  const generated = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')
  
  return generated === signature
}

/**
 * Convert rupees to paise (Razorpay uses smallest currency unit)
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100)
}

/**
 * Convert paise to rupees
 */
export function paiseToRupees(paise: number): number {
  return paise / 100
}