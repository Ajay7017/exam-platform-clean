// src/app/(student)/exams/[slug]/components/PurchaseButton.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, CheckCircle2 } from 'lucide-react'

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

export default function PurchaseButton({
  examId,
  examSlug,
  examTitle,
  price,
  isFree,
  isPurchased
}: PurchaseButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePurchase = async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. Create order
      const orderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          type: 'single_exam'
        })
      })

      const orderData = await orderResponse.json()

      if (!orderResponse.ok) {
        setError(orderData.error || 'Failed to create order')
        setLoading(false)
        return
      }

      // Handle free exam
      if (orderData.isFree) {
        router.push(`/exams/${examSlug}`)
        router.refresh()
        return
      }

      // 2. Load Razorpay if not already loaded
      if (!window.Razorpay) {
        setError('Payment gateway not loaded. Please refresh the page.')
        setLoading(false)
        return
      }

      // 3. Open Razorpay checkout
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Exam Platform',
        description: orderData.examTitle,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          // 4. Verify payment on backend
          try {
            setLoading(true)
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                purchaseId: orderData.purchaseId
              })
            })

            const verifyData = await verifyResponse.json()

            if (verifyResponse.ok && verifyData.success) {
              // Success! Redirect to exam page
              router.push(`/exams/${examSlug}?payment=success`)
              router.refresh()
            } else {
              setError(verifyData.error || 'Payment verification failed')
              setLoading(false)
            }
          } catch (error) {
            console.error('Verification error:', error)
            setError('Payment verification failed. Please contact support.')
            setLoading(false)
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        theme: {
          color: '#3B82F6'
        },
        modal: {
          ondismiss: function() {
            setLoading(false)
            setError('Payment cancelled')
          }
        }
      }

      const razorpay = new window.Razorpay(options)
      razorpay.on('payment.failed', function (response: any) {
        setError(response.error.description || 'Payment failed')
        setLoading(false)
      })
      
      razorpay.open()

    } catch (error) {
      console.error('Purchase error:', error)
      setError('Failed to initiate payment. Please try again.')
      setLoading(false)
    }
  }

  if (isPurchased) {
    return (
      <button
        onClick={() => router.push(`/exam/${examSlug}/start`)}
        className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
      >
        <CheckCircle2 className="h-5 w-5" />
        Start Exam
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handlePurchase}
        disabled={loading}
        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : isFree ? (
          'Enroll Free'
        ) : (
          <>
            <Lock className="h-5 w-5" />
            Buy Now - ₹{(price / 100).toFixed(2)}
          </>
        )}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {!isFree && (
        <div className="text-center text-sm text-gray-500">
          <Lock className="h-4 w-4 inline mr-1" />
          Secure payment powered by Razorpay
        </div>
      )}
    </div>
  )
}