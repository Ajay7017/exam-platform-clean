// src/components/results/FeedbackTab.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Loader2, Star, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

interface FeedbackTabProps {
  examId:    string
  attemptId: string
}

export function FeedbackTab({ examId, attemptId }: FeedbackTabProps) {
  const [difficultyRating, setDifficultyRating] = useState(0)
  const [experienceRating, setExperienceRating] = useState(0)
  const [comments,         setComments]         = useState('')
  const [submitting,       setSubmitting]       = useState(false)
  const [submitted,        setSubmitted]        = useState(false)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [checkingPrior,    setCheckingPrior]    = useState(true)

  // check if student already submitted feedback for this attempt
  useEffect(() => {
    const checkPrior = async () => {
      try {
        const res  = await fetch('/api/feedback')
        if (!res.ok) return
        const data = await res.json()
        const prior = (data.feedbacks || []).find(
        (f: { attemptId: string }) => f.attemptId === attemptId
        )
        if (prior) setAlreadySubmitted(true)
      } catch {
        // silent — non critical
      } finally {
        setCheckingPrior(false)
      }
    }
    checkPrior()
  }, [attemptId])

  const canSubmit = difficultyRating > 0 && experienceRating > 0

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          examId,
          attemptId,
          difficultyRating,
          experienceRating,
          comments: comments.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to submit feedback')
      }

      setSubmitted(true)
      toast.success('Feedback submitted! Thank you 🎉')
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (checkingPrior) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
    </div>
  )

  if (alreadySubmitted) return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
        <CheckCircle className="w-10 h-10 text-blue-500" />
        <p className="text-base font-semibold text-blue-700">
          Feedback Already Submitted
        </p>
        <p className="text-sm text-blue-600 text-center max-w-xs">
          You've already submitted feedback for this attempt. Visit the{' '}
          <strong>Feedback</strong> section in your sidebar to see any admin replies.
        </p>
      </CardContent>
    </Card>
  )

  if (submitted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <CheckCircle className="w-10 h-10 text-green-500" />
          <p className="text-base font-semibold text-green-700">
            Feedback Submitted!
          </p>
          <p className="text-sm text-green-600 text-center max-w-xs">
            Thank you for your feedback. You can view any admin replies in the
            <strong> Feedback</strong> section of your sidebar.
          </p>
          <Badge className="bg-green-100 text-green-700 mt-1">
            Response within 24 hours
          </Badge>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-400" />
            Share Your Experience
          </CardTitle>
          <p className="text-xs text-gray-400">
            Your feedback helps us improve. All fields marked * are required.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Difficulty Rating */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-700">
              Paper Difficulty <span className="text-red-500">*</span>
            </p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarButton
                  key={star}
                  star={star}
                  value={difficultyRating}
                  onChange={setDifficultyRating}
                  disabled={submitting}
                />
              ))}
              {difficultyRating > 0 && (
                <span className="ml-2 text-xs text-gray-500">
                  {
                    ['', 'Very Hard', 'Hard', 'Medium', 'Easy', 'Very Easy'][
                      difficultyRating
                    ]
                  }
                </span>
              )}
            </div>
          </div>

          {/* Experience Rating */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-700">
              Overall Experience <span className="text-red-500">*</span>
            </p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarButton
                  key={star}
                  star={star}
                  value={experienceRating}
                  onChange={setExperienceRating}
                  disabled={submitting}
                />
              ))}
              {experienceRating > 0 && (
                <span className="ml-2 text-xs text-gray-500">
                  {
                    ['', 'Very Poor', 'Poor', 'Okay', 'Good', 'Excellent'][
                      experienceRating
                    ]
                  }
                </span>
              )}
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-700">
              Additional Comments{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </p>
            <Textarea
              placeholder="Anything else you'd like to share about this exam..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={submitting}
              maxLength={1000}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-400 text-right">
              {comments.length}/1000
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              You'll receive a reply within 24 hours
            </p>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              size="sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Feedback'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── small helper so JSX above stays clean ─────────────────────────────────
function StarButton({
  star, value, onChange, disabled,
}: {
  star: number; value: number; onChange: (v: number) => void; disabled: boolean
}) {
  const [hovered, setHovered] = useState(0)
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(star)}
      onMouseEnter={() => setHovered(star)}
      onMouseLeave={() => setHovered(0)}
      className="transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Star
        className={`w-7 h-7 transition-colors ${
          star <= (hovered || value)
            ? 'fill-amber-400 text-amber-400'
            : 'text-gray-300'
        }`}
      />
    </button>
  )
}