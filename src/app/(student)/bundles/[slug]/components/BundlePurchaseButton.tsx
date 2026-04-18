// src/app/(student)/bundles/[slug]/components/BundlePurchaseButton.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, CheckCircle2, Package } from 'lucide-react'
import { toast } from 'sonner'

declare global {
  interface Window {
    Razorpay: any
  }
}

interface BundlePurchaseButtonProps {
  bundleId: string
  bundleName: string
  price: number          // final price in paise
  originalPrice: number  // before discount in paise
  discount: number       // percentage
  isPurchased: boolean
}

export default function BundlePurchaseButton({
  bundleId,
  bundleName,
  price,
  originalPrice,
  discount,
  isPurchased,
}: BundlePurchaseButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePurchase = async () => {
    setLoading(true)
    setError(null)

    try {
      const orderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'bundle', bundleId }),
      })

      const orderData = await orderResponse.json()

      if (!orderResponse.ok) {
        throw new Error(orderData.error || 'Failed to create order')
      }

      if (orderData.alreadyOwned) {
        toast.success('You already own this bundle!')
        router.refresh()
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
        description: orderData.bundleName,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            setLoading(true)
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

            const verifyData = await verifyResponse.json()

            if (verifyResponse.ok && verifyData.success) {
              toast.success('🎉 Bundle Purchased!', {
                description: 'All exams in this bundle are now unlocked.',
              })
              router.refresh()
            } else {
              throw new Error(verifyData.error || 'Payment verification failed')
            }
          } catch (err: any) {
            setError('Payment verification failed. Please contact support.')
            toast.error('Payment verification failed')
          } finally {
            setLoading(false)
          }
        },
        prefill: { name: '', email: '', contact: '' },
        theme: { color: '#3B82F6' },
        modal: {
          ondismiss: () => setLoading(false),
        },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.on('payment.failed', (response: any) => {
        setError(response.error.description || 'Payment failed')
        toast.error('Payment failed')
        setLoading(false)
      })
      razorpay.open()
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment. Please try again.')
      toast.error(err.message || 'Failed to initiate payment')
      setLoading(false)
    }
  }

  if (isPurchased) {
    return (
      <div className="space-y-2">
        <div className="w-full bg-green-50 border border-green-200 text-green-800 px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Bundle Purchased
        </div>
        <p className="text-sm text-center text-gray-500">
          All exams in this bundle are unlocked for you.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Price display */}
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-gray-900">
          ₹{(price / 100).toFixed(0)}
        </span>
        {discount > 0 && (
          <>
            <span className="text-lg text-gray-400 line-through">
              ₹{(originalPrice / 100).toFixed(0)}
            </span>
            <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              {discount}% off
            </span>
          </>
        )}
      </div>

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
            <Package className="h-5 w-5" />
            Buy Bundle — ₹{(price / 100).toFixed(0)}
          </>
        )}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="text-center text-sm text-gray-500 flex items-center justify-center gap-1">
        <Lock className="h-3.5 w-3.5" />
        Secure payment powered by Razorpay
      </div>
    </div>
  )
}