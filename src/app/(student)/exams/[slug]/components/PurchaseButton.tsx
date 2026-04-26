// src/app/(student)/exams/[slug]/components/PurchaseButton.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, CheckCircle2, Play, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

declare global {
  interface Window {
    Razorpay: any
  }
}

interface PurchaseButtonProps {
  examId: string
  examSlug: string
  examTitle: string
  price: number
  isFree: boolean
  isPurchased: boolean
}

const VERIFY_TIMEOUT_MS = 20_000

export default function PurchaseButton({
  examId,
  examSlug,
  examTitle,
  price,
  isFree,
  isPurchased,
}: PurchaseButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentPossiblyComplete, setPaymentPossiblyComplete] = useState(false)

  const resetState = () => {
    setLoading(false)
    setVerifying(false)
  }

  const handleStartExam = () => {
    router.push(`/exam/${examSlug}/start`)
  }

  const handleEnrollFree = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId, type: 'single_exam' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to enroll')
      }

      if (data.isFree || data.alreadyOwned) {
        toast.success('✅ Enrolled successfully!', {
          description: 'You can now start the exam. Good luck!',
        })
        router.refresh()
        setTimeout(() => {
          router.push(`/exam/${examSlug}/start`)
        }, 1000)
      }
    } catch (error: any) {
      console.error('[EXAM] Enrollment error:', error)
      setError(error.message || 'Failed to enroll. Please try again.')
      toast.error('Failed to enroll')
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async () => {
    setLoading(true)
    setError(null)
    setPaymentPossiblyComplete(false)

    try {
      const orderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId, type: 'single_exam' }),
      })

      const orderData = await orderResponse.json()

      if (!orderResponse.ok) {
        throw new Error(orderData.error || 'Failed to create order')
      }

      if (orderData.alreadyOwned) {
        toast.success('You already own this exam!')
        router.refresh()
        resetState()
        return
      }

      if (!window.Razorpay) {
        throw new Error('Payment gateway not loaded. Please refresh the page.')
      }

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Mockzy',
        description: orderData.examTitle,
        order_id: orderData.orderId,

        handler: async function (response: any) {
          setVerifying(true)
          setLoading(false)

          const verifyTimeout = setTimeout(() => {
            console.warn('[EXAM] Verify timed out — payment may still be processing')
            setVerifying(false)
            setPaymentPossiblyComplete(true)
            toast.info('Payment received. Verifying access...', {
              description: 'Please check My Purchases in a moment.',
              duration: 8000,
            })
          }, VERIFY_TIMEOUT_MS)

          try {
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                purchaseId: orderData.purchaseId,
              }),
            })

            clearTimeout(verifyTimeout)
            const verifyData = await verifyResponse.json()

            if (verifyResponse.ok && verifyData.success) {
              toast.success('🎉 Payment Successful!', {
                description: 'You can now start the exam. Good luck!',
              })
              router.refresh()
              setTimeout(() => {
                router.push(`/exam/${examSlug}/start`)
              }, 1000)
            } else {
              console.error('[EXAM] Verify failed after payment:', verifyData)
              setPaymentPossiblyComplete(true)
              toast.warning('Payment received but access setup delayed.', {
                description: 'Please check My Purchases or contact support.',
                duration: 10000,
              })
            }
          } catch (err: any) {
            clearTimeout(verifyTimeout)
            console.error('[EXAM] Verify network error:', err)
            setPaymentPossiblyComplete(true)
            toast.warning('Payment received. Please check My Purchases.', {
              duration: 10000,
            })
          } finally {
            setVerifying(false)
          }
        },

        prefill: { name: '', email: '', contact: '' },
        theme: { color: '#3B82F6' },
        modal: {
          ondismiss: () => {
            resetState()
          },
        },
      }

      const razorpay = new window.Razorpay(options)

      razorpay.on('payment.failed', (response: any) => {
        const msg = response.error?.description || 'Payment failed'
        setError(msg)
        toast.error('Payment failed', { description: msg })
        resetState()
      })

      razorpay.open()
    } catch (err: any) {
      console.error('[EXAM] Purchase error:', err)
      setError(err.message || 'Failed to initiate payment. Please try again.')
      toast.error(err.message || 'Failed to initiate payment')
      resetState()
    }
  }

  // Already purchased or free — show Start button
  if (isPurchased || isFree) {
    return (
      <div className="space-y-3">
        <button
          onClick={handleStartExam}
          disabled={loading}
          className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              Start Exam
            </>
          )}
        </button>

        {isFree && !isPurchased && (
          <p className="text-sm text-center text-muted-foreground">
            This is a free exam. Click to start immediately.
          </p>
        )}

        {isPurchased && (
          <div className="flex items-center justify-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>Already Enrolled</span>
          </div>
        )}
      </div>
    )
  }

  // Free exam, not yet enrolled
  if (isFree && !isPurchased) {
    return (
      <div className="space-y-3">
        <button
          onClick={handleEnrollFree}
          disabled={loading}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Enrolling...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5" />
              Enroll Free
            </>
          )}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <p className="text-sm text-center text-muted-foreground">
          Free exam — No payment required
        </p>
      </div>
    )
  }

  // Payment went through but access isn't confirmed yet
  if (paymentPossiblyComplete) {
    return (
      <div className="space-y-3">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Payment received!</p>
            <p className="mt-0.5">
              Your access is being activated. Please check{' '}
              <button
                onClick={() => router.push('/purchases')}
                className="underline font-medium"
              >
                My Purchases
              </button>{' '}
              in a moment, or refresh this page.
            </p>
          </div>
        </div>
        <button
          onClick={() => router.refresh()}
          className="w-full bg-blue-50 text-blue-700 border border-blue-200 px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    )
  }

  // Paid exam, not purchased
  return (
    <div className="space-y-3">
      <button
        onClick={handlePurchase}
        disabled={loading || verifying}
        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {verifying ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Confirming access...
          </>
        ) : loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="h-5 w-5" />
            Buy Now — ₹{(price / 100).toFixed(0)}
          </>
        )}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-1">
        <Lock className="h-4 w-4" />
        Secure payment powered by Razorpay
      </div>
    </div>
  )
}