'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, CalendarDays, ChevronRight, Zap } from 'lucide-react'

interface PopupEvent {
  title: string
  slug: string
  popupMessage: string | null
  popupLinkLabel: string | null
  examDate: string | null
}

export function ExamEventPopup() {
  const [event, setEvent] = useState<PopupEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Once per session — if already dismissed, don't show again
    const dismissed = sessionStorage.getItem('examEventPopupDismissed')
    if (dismissed) return

    const fetchPopupEvent = async () => {
      try {
        const res = await fetch('/api/exam-events')
        const data = await res.json()

        // Find first published event with popup enabled
        const popupEvent = (data.examEvents || []).find(
          (e: any) => e.popupEnabled && e.popupMessage
        )

        if (popupEvent) {
          setEvent(popupEvent)
          // Small delay so page loads first, then popup appears
          setTimeout(() => setVisible(true), 1200)
        }
      } catch {
        // Silently fail — popup is non-critical
      }
    }

    fetchPopupEvent()
  }, [])

  const handleDismiss = () => {
    setVisible(false)
    sessionStorage.setItem('examEventPopupDismissed', '1')
  }

  if (!visible || !event) return null

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative w-full max-w-md pointer-events-auto animate-in zoom-in-95 fade-in duration-300"
          onClick={e => e.stopPropagation()}
        >
          {/* Card */}
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">

            {/* Top gradient bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-violet-500 to-pink-500" />

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 pt-6 pb-7 space-y-5">

              {/* Badge */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                  <Zap className="w-3 h-3" />
                  Live Now
                </span>
                {event.examDate && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                    <CalendarDays className="w-3 h-3" />
                    {formatDate(event.examDate)}
                  </span>
                )}
              </div>

              {/* Title */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-snug">
                  {event.title}
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {event.popupMessage}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <Link
                  href={`/exam-events/${event.slug}`}
                  onClick={handleDismiss}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-blue-200"
                >
                  {event.popupLinkLabel || 'View Details'}
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}