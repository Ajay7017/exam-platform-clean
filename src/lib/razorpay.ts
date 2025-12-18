// src/lib/razorpay.ts
import Razorpay from 'razorpay'
import crypto from 'crypto'

// Validate required environment variables
const validateEnv = () => {
  const required = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required Razorpay env vars: ${missing.join(', ')}`)
  }
}

// Validate on module load
validateEnv()

// Detect mode (test vs live)
export const isTestMode = process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') ?? true

// Log mode on startup (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log(`🔐 Razorpay initialized in ${isTestMode ? 'TEST' : 'LIVE'} mode`)
}

// Initialize Razorpay instance
export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

/**
 * Verify Razorpay payment signature
 * CRITICAL: This prevents payment fraud
 * 
 * @param orderId - Razorpay order ID
 * @param paymentId - Razorpay payment ID
 * @param signature - Signature from Razorpay response
 * @returns boolean - True if signature is valid
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  try {
    const text = `${orderId}|${paymentId}`
    const generated = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(text)
      .digest('hex')
    
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(generated),
      Buffer.from(signature)
    )
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

/**
 * Verify webhook signature
 * Used for webhook endpoint security
 * 
 * @param body - Raw webhook body string
 * @param signature - Signature from webhook header
 * @returns boolean - True if signature is valid
 */
export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  try {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      console.error('RAZORPAY_WEBHOOK_SECRET not configured')
      return false
    }

    const generated = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex')
    
    // Use timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(generated),
      Buffer.from(signature)
    )
  } catch (error) {
    console.error('Webhook signature verification error:', error)
    return false
  }
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

/**
 * Validate payment amount
 * Ensures amount is within Razorpay limits
 */
export function validatePaymentAmount(amountInPaise: number): boolean {
  // Razorpay minimum: ₹1.00 (100 paise)
  // Razorpay maximum: ₹10,00,000 (1,000,000,000 paise)
  return amountInPaise >= 100 && amountInPaise <= 1000000000
}

/**
 * Format amount for display
 */
export function formatAmount(amountInPaise: number): string {
  const rupees = paiseToRupees(amountInPaise)
  return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Get Razorpay public key for frontend
 * Ensures we don't accidentally expose test keys in production
 */
export function getRazorpayPublicKey(): string {
  const key = process.env.RAZORPAY_KEY_ID!
  
  // Production safety check
  if (process.env.NODE_ENV === 'production' && key.startsWith('rzp_test_')) {
    throw new Error('Cannot use test keys in production!')
  }
  
  return key
}