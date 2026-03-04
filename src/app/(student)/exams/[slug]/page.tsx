// src/app/(student)/exams/[slug]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  FileText,
  Award,
  Users,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import PurchaseButton from './components/PurchaseButton'

interface ExamDetails {
  id: string
  title: string
  slug: string
  subject: string
  subjectSlug: string
  thumbnail: string
  duration: number
  totalQuestions: number
  totalMarks: number
  difficulty: 'easy' | 'medium' | 'hard'
  price: number
  isFree: boolean
  isPurchased: boolean
  instructions: string | null
  topics: string[]
  totalAttempts: number
}

// ── helpers (same as browse page for consistency) ──────────────────────────

const SUBJECT_GRADIENTS = [
  'from-violet-500 to-purple-700',
  'from-blue-500 to-cyan-700',
  'from-emerald-500 to-teal-700',
  'from-orange-500 to-amber-700',
  'from-pink-500 to-rose-700',
  'from-indigo-500 to-blue-700',
  'from-teal-500 to-green-700',
  'from-red-500 to-orange-700',
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

const difficultyColors: Record<string, string> = {
  easy:   'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard:   'bg-red-100 text-red-700',
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ExamDetailsPage() {
  const params       = useParams()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const slug         = params.slug as string

  const [exam, setExam]       = useState<ExamDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchExamDetails()

    const paymentStatus = searchParams.get('payment')
    if (paymentStatus === 'success') {
      toast.success('🎉 Payment Successful!', {
        description: 'You can now start the exam. Good luck!',
      })
      router.replace(`/exams/${slug}`)
    }
  }, [slug])

  const fetchExamDetails = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/exams/${slug}`)

      if (!res.ok) {
        if (res.status === 404) {
          toast.error('Exam not found')
          router.push('/exams')
          return
        }
        throw new Error('Failed to fetch exam details')
      }

      const data = await res.json()
      setExam(data)
    } catch (error: any) {
      console.error('Failed to fetch exam:', error)
      toast.error('Failed to load exam details')
    } finally {
      setLoading(false)
    }
  }

  // ── loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Exam not found</p>
      </div>
    )
  }

  const gradient = getSubjectGradient(exam.subject)
  const initial  = getSubjectInitial(exam.subject)

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-4 -mt-2">

      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/exams')}
        className="-ml-2 h-8 text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Exams
      </Button>

      {/* ── Main Header Card ── */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">

            {/* Left — colored gradient panel */}
            <div
              className={`relative bg-gradient-to-br ${gradient} md:w-56 h-48 md:h-auto flex-shrink-0 flex flex-col items-center justify-center gap-3`}
            >
              {/* dot pattern */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                  backgroundSize: '18px 18px',
                }}
              />
              <div className="relative w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">{initial}</span>
              </div>
              <span className="relative text-white/80 text-xs font-medium tracking-widest uppercase">
                {exam.subject}
              </span>
            </div>

            {/* Right — exam info */}
            <div className="flex-1 p-5 flex flex-col gap-4">

              {/* badges + title */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">{exam.subject}</Badge>
                  <Badge className={`text-xs ${difficultyColors[exam.difficulty]}`}>
                    {exam.difficulty}
                  </Badge>
                  {exam.isFree && (
                    <Badge className="text-xs bg-green-100 text-green-800">Free</Badge>
                  )}
                  {exam.isPurchased && !exam.isFree && (
                    <Badge className="text-xs bg-blue-100 text-blue-800">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Purchased
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
              </div>

              {/* 4 stats in a tight row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: Clock,    label: 'Duration',  value: `${exam.duration} min` },
                  { icon: FileText, label: 'Questions', value: exam.totalQuestions },
                  { icon: Award,    label: 'Marks',     value: exam.totalMarks },
                  { icon: Users,    label: 'Attempts',  value: exam.totalAttempts },
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"
                  >
                    <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Topics */}
              {exam.topics.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-500">Topics:</span>
                  {exam.topics.map((topic, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Purchase / Start button */}
              <div className="mt-auto">
                <PurchaseButton
                  examId={exam.id}
                  examSlug={exam.slug}
                  examTitle={exam.title}
                  price={exam.price}
                  isFree={exam.isFree}
                  isPurchased={exam.isPurchased}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Instructions (only if present) ── */}
      {exam.instructions && (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Instructions</h2>
            <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
              {exam.instructions}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Security Notice ── */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-900">Question Preview Not Available</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Questions will be visible only after you start the exam. This ensures a fair testing environment for all students.
          </p>
        </div>
      </div>

      {/* ── Exam Summary (compact, no redundant card) ── */}
      <Card>
        <CardContent className="p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Exam Summary</h2>
          <div className="divide-y divide-gray-100 text-sm">
            {[
              { label: 'Total Questions', value: exam.totalQuestions },
              { label: 'Total Marks',     value: exam.totalMarks },
              { label: 'Time Allowed',    value: `${exam.duration} minutes` },
              {
                label: 'Difficulty',
                value: (
                  <Badge className={`text-xs ${difficultyColors[exam.difficulty]}`}>
                    {exam.difficulty}
                  </Badge>
                ),
              },
              ...(!exam.isFree
                ? [{
                    label: 'Price',
                    value: (
                      <span className="font-bold text-gray-900">
                        ₹{(exam.price / 100).toFixed(0)}
                      </span>
                    ),
                  }]
                : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}