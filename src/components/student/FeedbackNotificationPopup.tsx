// src/components/student/FeedbackNotificationPopup.tsx
'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { MessageSquare, X } from 'lucide-react'
import Link from 'next/link'

const STORAGE_KEY = 'feedback_last_seen_at'

export function FeedbackNotificationPopup() {
  const pathname        = usePathname()
  const [show, setShow] = useState(false)

  // mark as seen when student visits /feedback
  useEffect(() => {
    if (pathname === '/feedback') {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString())
      setShow(false)
    }
  }, [pathname])

  useEffect(() => {
    // don't show on the feedback page itself
    if (pathname === '/feedback') return

    // only run once per browser session using sessionStorage
    const sessionKey = 'feedback_popup_checked'
    if (sessionStorage.getItem(sessionKey)) return
    sessionStorage.setItem(sessionKey, '1')

    const checkNotifications = async () => {
      try {
        const lastSeenAt = localStorage.getItem(STORAGE_KEY)

        const res = await fetch('/api/student/notifications')
        if (!res.ok) return
        const data = await res.json()

        if (!data.hasNewReplies) return

        // if student has never visited feedback page, show popup
        if (!lastSeenAt) {
          setShow(true)
          return
        }

        // show only if there are replies AFTER the last time they visited
        if (
          data.latestReplyAt &&
          new Date(data.latestReplyAt) > new Date(lastSeenAt)
        ) {
          setShow(true)
        }
      } catch {
        // silent fail — not critical
      }
    }

    const timer = setTimeout(checkNotifications, 1500)
    return () => clearTimeout(timer)
  }, [pathname])

  const handleClose = () => {
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-white border border-blue-200 shadow-lg rounded-xl p-4 max-w-xs w-full flex items-start gap-3">

        {/* Icon */}
        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <MessageSquare className="w-4 h-4 text-blue-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            You have a new reply!
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            An admin has responded to your feedback or error report.
          </p>
          <Link
            href="/feedback"
            onClick={handleClose}
            className="inline-block mt-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            View in Feedback section →
          </Link>
        </div>

        {/* Close */}
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}