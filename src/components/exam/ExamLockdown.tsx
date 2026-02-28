// src/components/exam/ExamLockdown.tsx
'use client'

import { useEffect, useCallback, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { AlertTriangle, XCircle } from 'lucide-react'

interface ExamLockdownProps {
  children: React.ReactNode
  attemptId: string
  onAutoSubmit: () => void
}

export interface ExamLockdownHandle {
  allowSubmission: () => void
}

export const ExamLockdown = forwardRef<ExamLockdownHandle, ExamLockdownProps>(
  function ExamLockdown({ children, attemptId, onAutoSubmit }, ref) {
    const [showWarning, setShowWarning] = useState(false)
    const [warningMessage, setWarningMessage] = useState('')
    const [warningCount, setWarningCount] = useState(0)

    const isSubmitting = useRef(false)
    const violationCount = useRef(0)
    const hasTerminated = useRef(false)
    const reportingInProgress = useRef(false)

    // Keep stable references to the listeners so we can remove them by name
    const preventUnloadRef = useRef<((e: BeforeUnloadEvent) => void) | null>(null)
    const preventBackRef = useRef<((e: PopStateEvent) => void) | null>(null)

    useImperativeHandle(ref, () => ({
      allowSubmission: () => {
        // ── THE REAL FIX ──────────────────────────────────────────────────────
        // Setting a flag is not enough — the beforeunload event can still fire
        // before the flag is read. We must REMOVE the listeners entirely so
        // they cannot possibly intercept the navigation from window.location.replace()
        isSubmitting.current = true

        if (preventUnloadRef.current) {
          window.removeEventListener('beforeunload', preventUnloadRef.current)
          preventUnloadRef.current = null
        }
        if (preventBackRef.current) {
          window.removeEventListener('popstate', preventBackRef.current)
          preventBackRef.current = null
        }
      }
    }))

    const enterFullscreen = useCallback(async () => {
      try {
        const elem = document.documentElement
        if (elem.requestFullscreen) {
          await elem.requestFullscreen()
        } else if ((elem as any).webkitRequestFullscreen) {
          await (elem as any).webkitRequestFullscreen()
        }
      } catch (error) {
        console.error('Failed to enter fullscreen:', error)
      }
    }, [])

    const reportViolation = useCallback(async (type: string, details?: string) => {
      if (hasTerminated.current || isSubmitting.current || reportingInProgress.current) return

      reportingInProgress.current = true
      violationCount.current += 1

      try {
        const res = await fetch(`/api/attempts/${attemptId}/violation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            details,
            count: violationCount.current,
            timestamp: new Date().toISOString()
          })
        })

        if (!res.ok) {
          reportingInProgress.current = false
          return
        }

        const data = await res.json()

        if (data.warning) {
          setWarningMessage(data.warning)
          setWarningCount(data.violationCount)
          setShowWarning(true)
          setTimeout(() => setShowWarning(false), 5000)
        }

        if (data.shouldTerminate && !hasTerminated.current) {
          hasTerminated.current = true
          setWarningMessage('Exam terminated due to multiple violations.')
          setShowWarning(true)
          setTimeout(() => {
            isSubmitting.current = true
            onAutoSubmit()
          }, 3000)
        }
      } catch (error) {
        console.error('Failed to report violation:', error)
      } finally {
        reportingInProgress.current = false
      }
    }, [attemptId, onAutoSubmit])

    useEffect(() => {
      enterFullscreen()

      // Define listeners and store refs so allowSubmission() can remove them
      const preventBack = (e: PopStateEvent) => {
        if (isSubmitting.current) return
        window.history.pushState(null, '', window.location.href)
        reportViolation('back_navigation', 'Attempted to use browser back button')
      }

      const preventUnload = (e: BeforeUnloadEvent) => {
        if (isSubmitting.current) return
        e.preventDefault()
        e.returnValue = 'Your exam is in progress. Are you sure you want to leave?'
        return e.returnValue
      }

      // Store refs for removal in allowSubmission()
      preventBackRef.current = preventBack
      preventUnloadRef.current = preventUnload

      const preventContextMenu = (e: MouseEvent) => {
        if (isSubmitting.current) return
        e.preventDefault()
        reportViolation('right_click', 'Right-click detected')
      }

      const preventShortcuts = (e: KeyboardEvent) => {
        if (isSubmitting.current) return
        if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
          e.preventDefault()
          reportViolation('refresh_attempt', 'Pressed refresh shortcut')
          return
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
          e.preventDefault()
          reportViolation('tab_close_attempt', 'Attempted to close tab')
          return
        }
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key))) {
          e.preventDefault()
          reportViolation('devtools', 'Attempted to open DevTools')
          return
        }
        if ((e.ctrlKey || e.metaKey) && ['n', 't'].includes(e.key)) {
          e.preventDefault()
          reportViolation('new_tab_attempt', 'Attempted to open new tab')
          return
        }
      }

      const handleFullscreenChange = () => {
        if (isSubmitting.current) return
        if (!document.fullscreenElement) {
          reportViolation('fullscreen_exit', 'Exited fullscreen mode')
          setTimeout(() => {
            if (!isSubmitting.current) enterFullscreen()
          }, 100)
        }
      }

      let visibilityTimeout: NodeJS.Timeout | null = null
      const handleVisibilityChange = () => {
        if (document.hidden && !isSubmitting.current) {
          if (!visibilityTimeout) {
            reportViolation('tab_switch', 'Switched to another tab/window')
            visibilityTimeout = setTimeout(() => { visibilityTimeout = null }, 2000)
          }
        }
      }

      let blurTimeout: NodeJS.Timeout | null = null
      const handleBlur = () => {
        if (!isSubmitting.current) {
          if (!blurTimeout) {
            reportViolation('window_blur', 'Window lost focus')
            blurTimeout = setTimeout(() => { blurTimeout = null }, 2000)
          }
        }
      }

      const preventCopy = (e: ClipboardEvent) => {
        if (isSubmitting.current) return
        e.preventDefault()
        reportViolation('copy_attempt', 'Attempted to copy content')
      }

      const preventPaste = (e: ClipboardEvent) => {
        if (isSubmitting.current) return
        e.preventDefault()
        reportViolation('paste_attempt', 'Attempted to paste content')
      }

      const preventCut = (e: ClipboardEvent) => {
        if (isSubmitting.current) return
        e.preventDefault()
        reportViolation('cut_attempt', 'Attempted to cut content')
      }

      window.history.pushState(null, '', window.location.href)
      window.addEventListener('popstate', preventBack)
      window.addEventListener('beforeunload', preventUnload)
      document.addEventListener('contextmenu', preventContextMenu)
      document.addEventListener('keydown', preventShortcuts)
      document.addEventListener('fullscreenchange', handleFullscreenChange)
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('blur', handleBlur)
      document.addEventListener('copy', preventCopy)
      document.addEventListener('paste', preventPaste)
      document.addEventListener('cut', preventCut)

      return () => {
        window.removeEventListener('popstate', preventBack)
        window.removeEventListener('beforeunload', preventUnload)
        document.removeEventListener('contextmenu', preventContextMenu)
        document.removeEventListener('keydown', preventShortcuts)
        document.removeEventListener('fullscreenchange', handleFullscreenChange)
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('blur', handleBlur)
        document.removeEventListener('copy', preventCopy)
        document.removeEventListener('paste', preventPaste)
        document.removeEventListener('cut', preventCut)
      }
    }, [attemptId, enterFullscreen, reportViolation])

    return (
      <>
        {showWarning && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full border-4 border-red-500">
              <div className="flex items-center gap-4 mb-4">
                {warningCount >= 3 ? (
                  <XCircle className="w-12 h-12 text-red-600 animate-pulse" />
                ) : (
                  <AlertTriangle className="w-12 h-12 text-orange-600 animate-bounce" />
                )}
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {warningCount >= 3 ? 'Exam Terminated' : `Warning ${warningCount}/2`}
                  </h3>
                  <p className="text-sm text-gray-500">Violation Detected</p>
                </div>
              </div>
              <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-6 rounded">
                <p className="text-red-800 font-medium">{warningMessage}</p>
              </div>
              {warningCount < 3 && (
                <div className="text-sm text-gray-600 space-y-2">
                  <p className="font-semibold">Please adhere to exam rules:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Stay in fullscreen mode</li>
                    <li>Do not switch tabs or windows</li>
                    <li>Do not refresh the page</li>
                    <li>Do not use browser navigation buttons</li>
                  </ul>
                </div>
              )}
              {warningCount >= 3 && (
                <p className="text-center text-gray-600 font-medium">Submitting exam in 3 seconds...</p>
              )}
            </div>
          </div>
        )}
        <div>{children}</div>
      </>
    )
  }
)