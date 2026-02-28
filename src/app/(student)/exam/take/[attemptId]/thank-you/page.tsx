// src/app/(student)/exam/take/[attemptId]/thank-you/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

export default function ThankYouPage() {
  const [countdown, setCountdown] = useState(5)
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    // Count down from 5 then close the tab
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          // Attempt to close the tab
          window.close()
          // If window.close() is blocked (e.g. tab was not opened by script),
          // show a fallback message instead of hanging
          setClosed(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center border border-green-100">
        
        {/* Success icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Exam Submitted!
        </h1>
        <p className="text-gray-500 mb-8">
          Your answers have been recorded successfully. Results will be available in your dashboard shortly.
        </p>

        {!closed ? (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-sm text-gray-500">This tab will close in</p>
            <p className="text-5xl font-bold text-green-600 my-2">{countdown}</p>
            <p className="text-sm text-gray-500">seconds</p>
          </div>
        ) : (
          // Fallback if window.close() was blocked by the browser
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <p className="text-sm text-amber-800 font-medium">
              You can now close this tab manually and return to your previous tab.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}