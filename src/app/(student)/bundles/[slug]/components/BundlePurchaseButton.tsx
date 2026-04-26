// src/app/(student)/bundles/[slug]/components/BundlePurchaseButton.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, CheckCircle2, Package, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

declare global {
  interface Window {
    Razorpay: any
  }
}

interface BundlePurchaseButtonProps {
  bundleId: string
  bundleName: string
  price: number
  originalPrice: number
  discount: number
  isPurchased: boolean
}

// How long to wait for verify before showing "check purchases" fallback
const VERIFY_TIMEOUT_MS = 20_000

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
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // True when payment went through but verify timed out / failed —
  // we show a softer "check your purchases" message instead of an error.
  const [paymentPossiblyComplete, setPaymentPossiblyComplete] = useState(false)

  const resetState = () => {
    setLoading(false)
    setVerifying(false)
  }

  const handlePurchase = async () => {
    setLoading(true)
    setError(null)
    setPaymentPossiblyComplete(false)

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
        description: orderData.bundleName,
        order_id: orderData.orderId,

        handler: async function (response: any) {
          // Payment confirmed by Razorpay — now verify on our backend
          setVerifying(true)
          setLoading(false)

          // Safety timeout: if verify takes too long, don't leave user stranded
          const verifyTimeout = setTimeout(() => {
            console.warn('[BUNDLE] Verify timed out — payment may still be processing')
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
              toast.success('🎉 Bundle Purchased!', {
                description: 'All exams in this bundle are now unlocked.',
              })
              router.refresh()
            } else {
              // Verify returned an error — but Razorpay already confirmed payment.
              // Don't show a hard error; instead prompt them to check purchases.
              console.error('[BUNDLE] Verify failed after payment:', verifyData)
              setPaymentPossiblyComplete(true)
              toast.warning('Payment received but access setup delayed.', {
                description: 'Please check My Purchases or contact support.',
                duration: 10000,
              })
            }
          } catch (err: any) {
            clearTimeout(verifyTimeout)
            console.error('[BUNDLE] Verify network error:', err)
            // Network error after Razorpay confirmed — treat as possibly complete
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
          // Modal dismissed without paying — reset loading
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
      // NOTE: Do NOT setLoading(false) here — loading stays true until
      // ondismiss, payment.failed, or handler fires.
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment. Please try again.')
      toast.error(err.message || 'Failed to initiate payment')
      resetState()
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