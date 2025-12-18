// src/app/(student)/exams/[slug]/components/PurchaseButton.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, CheckCircle2, Play } from 'lucide-react'
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
        body: JSON.stringify({
          examId,
          type: 'single_exam'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to enroll')
      }

      if (data.isFree || data.alreadyOwned) {
        toast.success('✅ Enrolled successfully!', {
          description: 'You can now start the exam. Good luck!'
        })
        
        // Refresh the page to update purchase status
        router.refresh()
        
        // Navigate after a short delay
        setTimeout(() => {
          router.push(`/exam/${examSlug}/start`)
        }, 1000)
      }
    } catch (error: any) {
      console.error('Enrollment error:', error)
      setError(error.message || 'Failed to enroll. Please try again.')
      toast.error('Failed to enroll')
    } finally {
      setLoading(false)
    }
  }

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
        throw new Error(orderData.error || 'Failed to create order')
      }

      // Handle already owned
      if (orderData.alreadyOwned) {
        toast.success('You already own this exam!')
        router.refresh()
        return
      }

      // 2. Load Razorpay if not already loaded
      if (!window.Razorpay) {
        throw new Error('Payment gateway not loaded. Please refresh the page.')
      }

      // 3. Open Razorpay checkout
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'ExamPro',
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
              toast.success('🎉 Payment Successful!', {
                description: 'You can now start the exam. Good luck!'
              })
              
              // Refresh to update purchase status
              router.refresh()
              
              setTimeout(() => {
                router.push(`/exam/${examSlug}/start`)
              }, 1000)
            } else {
              throw new Error(verifyData.error || 'Payment verification failed')
            }
          } catch (error: any) {
            console.error('Verification error:', error)
            setError('Payment verification failed. Please contact support.')
            toast.error('Payment verification failed')
          } finally {
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
          }
        }
      }

      const razorpay = new window.Razorpay(options)
      razorpay.on('payment.failed', function (response: any) {
        setError(response.error.description || 'Payment failed')
        toast.error('Payment failed')
        setLoading(false)
      })
      
      razorpay.open()

    } catch (error: any) {
      console.error('Purchase error:', error)
      setError(error.message || 'Failed to initiate payment. Please try again.')
      toast.error(error.message || 'Failed to initiate payment')
      setLoading(false)
    }
  }

  // Case 1: Already purchased or enrolled (free/paid)
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

  // Case 2: Free exam, not yet enrolled
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
          Free exam - No payment required
        </p>
      </div>
    )
  }

  // Case 3: Paid exam, not purchased
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
        ) : (
          <>
            <Lock className="h-5 w-5" />
            Buy Now - ₹{(price / 100).toFixed(0)}
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