// src/app/(student)/exam/[slug]/start/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Clock, FileText, Award, AlertTriangle,
  ArrowLeft, Loader2, Phone, ExternalLink, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

interface ExamStartData {
  id:             string
  title:          string
  slug:           string
  subject:        string
  duration:       number
  totalQuestions: number
  totalMarks:     number
  instructions:   string | null
  allowReview:    boolean
  isFree:         boolean
  isPurchased:    boolean
}

const SUBJECT_GRADIENTS = [
  'from-violet-500 to-purple-700', 'from-blue-500 to-cyan-700',
  'from-emerald-500 to-teal-700',  'from-orange-500 to-amber-700',
  'from-pink-500 to-rose-700',     'from-indigo-500 to-blue-700',
  'from-teal-500 to-green-700',    'from-red-500 to-orange-700',
]

function getSubjectGradient(subject: string) {
  let hash = 0
  for (let i = 0; i < subject.length; i++)
    hash = subject.charCodeAt(i) + ((hash << 5) - hash)
  return SUBJECT_GRADIENTS[Math.abs(hash) % SUBJECT_GRADIENTS.length]
}

function getSubjectInitial(subject: string) {
  return subject?.trim()?.[0]?.toUpperCase() || '?'
}

export default function ExamStartPage() {
  const params = useParams()
  const router = useRouter()
  const slug   = params.slug as string

  const [exam, setExam]                   = useState<ExamStartData | null>(null)
  const [loading, setLoading]             = useState(true)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [starting, setStarting]           = useState(false)
  const [phoneRequired, setPhoneRequired] = useState(false)

  // ✅ NEW: track whether the student already has an official attempt
  const [hasPreviousAttempt, setHasPreviousAttempt] = useState(false)

  useEffect(() => { fetchExamData() }, [slug])

  const fetchExamData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/exams/${slug}`)
      if (!res.ok) {
        if (res.status === 404) { toast.error('Exam not found'); router.push('/exams'); return }
        throw new Error('Failed to fetch exam data')
      }
      const data = await res.json()
      setExam(data)

      // ✅ NEW: check if student already has a completed official attempt
      // Use the exam-specific attempts check endpoint
      const checkRes = await fetch(`/api/attempts/check?examId=${data.id}`)
      if (checkRes.ok) {
        const checkData = await checkRes.json()
        setHasPreviousAttempt(checkData.hasOfficialAttempt === true)
      }
    } catch (error: any) {
      console.error('Failed to fetch exam:', error)
      toast.error('Failed to load exam details')
      router.push('/exams')
    } finally {
      setLoading(false)
    }
  }

  const handleStartExam = async () => {
    if (!agreedToTerms) { toast.error('Please agree to the terms and conditions'); return }
    if (!exam?.isFree && !exam?.isPurchased) {
      toast.error('Please purchase this exam first')
      router.push(`/exams/${exam?.slug}`)
      return
    }

    const newTab = window.open('', '_blank')
    if (!newTab) {
      toast.error('Popup blocked. Please allow popups for this site and try again.')
      return
    }

    newTab.document.write(`
      <html>
        <head><title>Starting Exam...</title></head>
        <body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;">
          <div style="text-align:center;">
            <div style="font-size:18px;font-weight:600;color:#374151;margin-bottom:8px;">Starting your exam...</div>
            <div style="color:#6b7280;font-size:14px;">Please wait a moment.</div>
          </div>
        </body>
      </html>
    `)

    try {
      setStarting(true)
      setPhoneRequired(false)

      const res  = await fetch('/api/attempts/start', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ examId: exam!.id }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'PHONE_REQUIRED') {
          newTab.close(); setPhoneRequired(true); setStarting(false); return
        }
        if (data.canResume && data.attemptId) {
          const shouldResume = confirm('You have an active attempt. Do you want to resume it?')
          if (shouldResume) newTab.location.href = `/exam/take/${data.attemptId}`
          else newTab.close()
          setStarting(false)
          return
        }
        newTab.close()
        throw new Error(data.error || 'Failed to start exam')
      }

      newTab.location.href = `/exam/take/${data.attemptId}`
      toast.success(
        data.isOfficial
          ? 'Exam opened in a new tab!'
          : 'Practice attempt opened in a new tab!'
      )
      setStarting(false)
    } catch (error: any) {
      console.error('Failed to start exam:', error)
      if (newTab && !newTab.closed) newTab.close()
      toast.error(error.message || 'Failed to start exam')
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  if (!exam) {
    return <div className="text-center py-20 text-muted-foreground">Exam not found</div>
  }

  const gradient = getSubjectGradient(exam.subject)
  const initial  = getSubjectInitial(exam.subject)

  return (
    <div className="max-w-4xl mx-auto space-y-4 -mt-2">

      <Button
        variant="ghost" size="sm"
        onClick={() => router.push(`/exams/${slug}`)}
        disabled={starting}
        className="-ml-2 h-8 text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Exam Details
      </Button>

      {/* Phone required banner — unchanged */}
      {phoneRequired && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
          <Phone className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-900">Phone number required</p>
            <p className="text-xs text-orange-800 mt-0.5">
              You must add a phone number to your profile before taking an exam.
            </p>
          </div>
          <Button size="sm" onClick={() => router.push('/profile')}
            className="bg-orange-600 hover:bg-orange-700 text-white shrink-0 h-8">
            Go to Profile
          </Button>
        </div>
      )}

      {/* ✅ NEW: Practice mode info banner */}
      {hasPreviousAttempt && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <RefreshCw className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Practice Mode</p>
            <p className="text-xs text-blue-800 mt-0.5">
              You've already submitted an official attempt. This will be a <strong>practice attempt</strong> — your score won't affect the leaderboard or your rank.
            </p>
          </div>
        </div>
      )}

      {/* Exam header — unchanged */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            <div className={`relative bg-gradient-to-br ${gradient} sm:w-44 h-36 sm:h-auto flex-shrink-0 flex flex-col items-center justify-center gap-2`}>
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
              <div className="relative w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                <span className="text-xl font-bold text-white">{initial}</span>
              </div>
              <span className="relative text-white/80 text-[10px] font-medium tracking-widest uppercase">
                {exam.subject}
              </span>
            </div>

            <div className="flex-1 p-4 flex flex-col justify-center gap-3">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{exam.title}</h1>
                <p className="text-sm text-gray-500">{exam.subject}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Clock,    label: 'Duration',    value: `${exam.duration} min` },
                  { icon: FileText, label: 'Questions',   value: exam.totalQuestions },
                  { icon: Award,    label: 'Total Marks', value: exam.totalMarks },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex flex-col items-center gap-1 bg-gray-50 rounded-lg py-2.5 px-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <p className="text-[10px] text-gray-500 leading-tight">{label}</p>
                    <p className="text-base font-bold text-gray-900">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4 items-start">

        {/* Instructions — unchanged */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Instructions</h2>
            <ul className="space-y-1.5 text-sm text-gray-600">
              {[
                'Read all questions carefully',
                'All questions are mandatory',
                'Navigate between questions using the question palette',
                'Ensure stable internet connection throughout the exam',
                'Do not refresh the page during the exam',
                'Your progress will be auto-saved periodically',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {/* Important Guidelines — unchanged */}
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <h3 className="text-sm font-semibold text-red-900">Important Guidelines</h3>
            </div>
            <ul className="space-y-1.5 text-xs text-red-800">
              {[
                'Once started, the timer cannot be paused',
                'Switching tabs or windows may be flagged as suspicious activity',
                'Your answers are auto-saved every 30 seconds',
                'Exam will auto-submit when time expires',
                'Exam opens in a new tab — this page stays open',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Agreement Checkbox — unchanged */}
          <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3">
            <Checkbox id="terms" checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              className="mt-0.5" />
            <label htmlFor="terms" className="text-xs text-gray-600 cursor-pointer leading-relaxed">
              I have read and understood the instructions. I agree to abide by the exam rules and understand that any violation may result in disqualification.
            </label>
          </div>

          {/* ✅ UPDATED: Start button label changes for practice mode */}
          <Button size="lg" onClick={handleStartExam}
            disabled={!agreedToTerms || starting}
            className={`w-full h-12 text-base ${hasPreviousAttempt ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
          >
            {starting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Starting...</>
            ) : hasPreviousAttempt ? (
              <><RefreshCw className="mr-2 h-4 w-4" />Re-attempt (Practice)</>
            ) : (
              <><ExternalLink className="mr-2 h-4 w-4" />Start Exam Now</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}