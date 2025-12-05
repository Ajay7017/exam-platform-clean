// src/components/exam/ExamLockdown.tsx
'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { AlertTriangle, XCircle } from 'lucide-react'

interface ExamLockdownProps {
  children: React.ReactNode
  attemptId: string
  onAutoSubmit: () => void
}

export function ExamLockdown({ children, attemptId, onAutoSubmit }: ExamLockdownProps) {
  const [showWarning, setShowWarning] = useState(false)
  const [warningMessage, setWarningMessage] = useState('')
  const [warningCount, setWarningCount] = useState(0)
  const isSubmitting = useRef(false)
  const violationCount = useRef(0)
  const hasTerminated = useRef(false)

  // Enter fullscreen
  const enterFullscreen = useCallback(async () => {
    try {
      const elem = document.documentElement
      if (elem.requestFullscreen) {
        await elem.requestFullscreen()
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen()
      } else if ((elem as any).msRequestFullscreen) {
        await (elem as any).msRequestFullscreen()
      }
    } catch (error) {
      console.error('Failed to enter fullscreen:', error)
    }
  }, [])

  // Report violation
  const reportViolation = useCallback(async (type: string, details?: string) => {
    if (hasTerminated.current || isSubmitting.current) return

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

      const data = await res.json()

      if (data.warning) {
        setWarningMessage(data.warning)
        setWarningCount(data.violationCount)
        setShowWarning(true)

        // Auto-hide warning after 5 seconds
        setTimeout(() => setShowWarning(false), 5000)
      }

      // Terminate exam on 3rd violation
      if (data.shouldTerminate && !hasTerminated.current) {
        hasTerminated.current = true
        setWarningMessage('Exam terminated due to multiple violations.')
        setShowWarning(true)
        
        // Wait 3 seconds then auto-submit
        setTimeout(() => {
          onAutoSubmit()
        }, 3000)
      }

    } catch (error) {
      console.error('Failed to report violation:', error)
    }
  }, [attemptId, onAutoSubmit])

  useEffect(() => {
    // Enter fullscreen on mount
    enterFullscreen()

    // Prevent back/forward navigation
    const preventBack = (e: PopStateEvent) => {
      window.history.pushState(null, '', window.location.href)
      reportViolation('back_navigation', 'Attempted to use browser back button')
    }

    // Prevent page unload/reload
    const preventUnload = (e: BeforeUnloadEvent) => {
      if (isSubmitting.current) return
      
      e.preventDefault()
      e.returnValue = 'Your exam is in progress. Are you sure you want to leave?'
      reportViolation('refresh_attempt', 'Attempted to reload page')
      return e.returnValue
    }

    // Prevent right-click
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      reportViolation('right_click', 'Right-click detected')
    }

    // Prevent keyboard shortcuts
    const preventShortcuts = (e: KeyboardEvent) => {
      // F5, Ctrl+R (refresh)
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
        e.preventDefault()
        reportViolation('refresh_attempt', 'Pressed refresh shortcut')
        return false
      }

      // Ctrl+W (close tab)
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault()
        reportViolation('tab_close_attempt', 'Attempted to close tab')
        return false
      }

      // F12, Ctrl+Shift+I (DevTools)
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))
      ) {
        e.preventDefault()
        reportViolation('devtools', 'Attempted to open DevTools')
        return false
      }

      // Ctrl+N, Ctrl+T (new window/tab)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 't')) {
        e.preventDefault()
        reportViolation('new_tab_attempt', 'Attempted to open new tab')
        return false
      }
    }

    // Detect fullscreen exit
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isSubmitting.current) {
        reportViolation('fullscreen_exit', 'Exited fullscreen mode')
        setTimeout(() => {
          enterFullscreen()
        }, 100)
      }
    }

    // Detect tab/window switch
    const handleVisibilityChange = () => {
      if (document.hidden && !isSubmitting.current) {
        reportViolation('tab_switch', 'Switched to another tab/window')
      }
    }

    const handleBlur = () => {
      if (!isSubmitting.current) {
        reportViolation('window_blur', 'Window lost focus')
      }
    }

    // Prevent copy/paste/cut
    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      reportViolation('copy_attempt', 'Attempted to copy content')
    }

    const preventPaste = (e: ClipboardEvent) => {
      e.preventDefault()
      reportViolation('paste_attempt', 'Attempted to paste content')
    }

    const preventCut = (e: ClipboardEvent) => {
      e.preventDefault()
      reportViolation('cut_attempt', 'Attempted to cut content')
    }

    // Push initial state
    window.history.pushState(null, '', window.location.href)

    // Add all listeners
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

    // Cleanup
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

  // Allow submission
  const allowSubmission = useCallback(() => {
    isSubmitting.current = true
  }, [])

  return (
    <>
      {/* Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full border-4 border-red-500 animate-in fade-in zoom-in duration-300">
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
              <p className="text-center text-gray-600 font-medium">
                Submitting exam in 3 seconds...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Exam Content */}
      <div data-allow-submission={allowSubmission}>
        {children}
      </div>
    </>
  )
}