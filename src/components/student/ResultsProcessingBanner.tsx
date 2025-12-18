// src/components/student/ResultsProcessingBanner.tsx
'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ResultsProcessingBannerProps {
  attemptId?: string
}

export function ResultsProcessingBanner({ attemptId }: ResultsProcessingBannerProps) {
  const router = useRouter()
  const [status, setStatus] = useState<'processing' | 'completed' | 'error'>('processing')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!attemptId) return

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev
        return prev + Math.random() * 10
      })
    }, 500)

    // Poll for results
    const checkResults = async () => {
      try {
        const res = await fetch(`/api/attempts/${attemptId}`)
        const data = await res.json()

        if (data.score !== null && data.rank !== null) {
          setProgress(100)
          setStatus('completed')
          clearInterval(progressInterval)
          
          // Refresh the page to show updated data
          setTimeout(() => {
            router.refresh()
          }, 1000)
        }
      } catch (error) {
        console.error('Failed to check results:', error)
      }
    }

    // Check immediately
    checkResults()

    // Then check every 2 seconds
    const pollInterval = setInterval(checkResults, 2000)

    // Cleanup
    return () => {
      clearInterval(progressInterval)
      clearInterval(pollInterval)
    }
  }, [attemptId, router])

  if (!attemptId) return null

  return (
    <div className="mb-6">
      {status === 'processing' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">
              Processing Your Results
            </h3>
            <p className="text-sm text-blue-700 mb-3">
              We're calculating your score, rank, and detailed performance analysis. This usually takes a few seconds.
            </p>
            <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-600 h-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-blue-600 mt-2">
              {Math.round(progress)}% complete
            </p>
          </div>
        </div>
      )}

      {status === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 animate-in fade-in duration-300">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-green-900 mb-1">
              Results Ready!
            </h3>
            <p className="text-sm text-green-700">
              Your exam has been graded successfully. Check your recent activity below to view detailed results.
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 mb-1">
              Processing Delayed
            </h3>
            <p className="text-sm text-red-700">
              Your exam is taking longer than expected to process. Please refresh the page in a few moments.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}