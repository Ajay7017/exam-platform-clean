// src/app/(student)/my-exams/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Clock,
  FileQuestion,
  Search,
  Play,
  BookOpen,
  Loader2,
  Trophy,
  Calendar,
  LayoutGrid,
  List,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface MyExam {
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
  isFree: boolean
  purchasedAt: string
  validUntil: string
  hasAttempted: boolean
  lastAttemptStatus: string | null
  lastScore: number | null
  lastScorePercentage: number | null
  lastAttemptDate: string | null
}

// ── helpers (consistent with browse/detail/start pages) ────────────────────

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

function getDifficultyColor(d: string) {
  switch (d) {
    case 'easy':   return 'bg-green-100 text-green-700'
    case 'medium': return 'bg-yellow-100 text-yellow-700'
    case 'hard':   return 'bg-red-100 text-red-700'
    default:       return 'bg-gray-100 text-gray-700'
  }
}

function getTimeAgo(dateString: string | null) {
  if (!dateString) return null
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  } catch {
    return null
  }
}

function ScorePill({ score, total, pct }: { score: number; total: number; pct: number | null }) {
  const p = pct ?? Math.round((score / total) * 100)
  const color =
    p >= 75 ? 'bg-green-50 text-green-700 border-green-200' :
    p >= 50 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
              'bg-red-50 text-red-700 border-red-200'
  return (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${color}`}>
      <span className="flex items-center gap-1">
        <Trophy className="h-3.5 w-3.5" />
        Last Score
      </span>
      <span className="font-semibold">{score}/{total} ({p}%)</span>
    </div>
  )
}

// ── Grid Card ──────────────────────────────────────────────────────────────

function ExamGridCard({ exam, onStart }: { exam: MyExam; onStart: () => void }) {
  const gradient = getSubjectGradient(exam.subject)
  const initial  = getSubjectInitial(exam.subject)

  return (
    <Card className="hover:shadow-lg transition-shadow overflow-hidden">
      <CardContent className="p-0">
        {/* Gradient header */}
        <div className={`relative h-36 bg-gradient-to-br ${gradient} overflow-hidden`}>
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{initial}</span>
            </div>
            <span className="text-white/80 text-xs font-medium tracking-wide uppercase">
              {exam.subject}
            </span>
          </div>
          {/* badges */}
          <div className="absolute top-3 left-3">
            <Badge className={getDifficultyColor(exam.difficulty)}>{exam.difficulty}</Badge>
          </div>
          <div className="absolute top-3 right-3">
            {exam.isFree
              ? <Badge className="bg-green-100 text-green-800">Free</Badge>
              : <Badge className="bg-blue-100 text-blue-800">Purchased</Badge>
            }
          </div>
        </div>

        {/* Info */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-gray-900 truncate" title={exam.title}>
              {exam.title}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{exam.subject}</p>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /><span>{exam.duration}min</span>
            </div>
            <div className="flex items-center gap-1">
              <FileQuestion className="h-3.5 w-3.5" /><span>{exam.totalQuestions} Q</span>
            </div>
            <div className="flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" /><span>{exam.totalMarks} marks</span>
            </div>
          </div>

          {/* Last score */}
          {exam.hasAttempted && exam.lastScore !== null && (
            <ScorePill
              score={exam.lastScore}
              total={exam.totalMarks}
              pct={exam.lastScorePercentage}
            />
          )}

          {/* Last attempt time */}
          {exam.lastAttemptDate && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar className="h-3 w-3" />
              <span>Attempted {getTimeAgo(exam.lastAttemptDate)}</span>
            </div>
          )}

          {/* CTA */}
          <Button className="w-full" size="sm" onClick={onStart}>
            {exam.hasAttempted
              ? <><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Retake Exam</>
              : <><Play className="h-3.5 w-3.5 mr-1.5" />Start Exam</>
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── List Row ───────────────────────────────────────────────────────────────

function ExamListRow({ exam, onStart }: { exam: MyExam; onStart: () => void }) {
  const gradient = getSubjectGradient(exam.subject)
  const initial  = getSubjectInitial(exam.subject)

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b last:border-0 hover:bg-gray-50 transition-colors">
      {/* mini avatar */}
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
        <span className="text-white font-bold text-sm">{initial}</span>
      </div>

      {/* title + subject */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{exam.title}</p>
        <p className="text-xs text-gray-500">{exam.subject}</p>
      </div>

      {/* difficulty */}
      <Badge className={`hidden sm:inline-flex ${getDifficultyColor(exam.difficulty)}`}>
        {exam.difficulty}
      </Badge>

      {/* meta */}
      <div className="hidden md:flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />{exam.duration}min
        </div>
        <div className="flex items-center gap-1">
          <FileQuestion className="h-3.5 w-3.5" />{exam.totalQuestions} Q
        </div>
      </div>

      {/* score */}
      {exam.hasAttempted && exam.lastScore !== null ? (
        <div className="hidden sm:block text-sm font-semibold text-blue-700 w-24 text-right">
          {exam.lastScore}/{exam.totalMarks}
          <span className="text-xs text-gray-500 font-normal ml-1">
            ({exam.lastScorePercentage}%)
          </span>
        </div>
      ) : (
        <div className="hidden sm:block w-24" />
      )}

      {/* CTA */}
      <Button size="sm" onClick={onStart} className="flex-shrink-0">
        {exam.hasAttempted
          ? <><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Retake</>
          : <><Play className="h-3.5 w-3.5 mr-1.5" />Start</>
        }
      </Button>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function MyExamsPage() {
  const router = useRouter()
  const [exams, setExams]           = useState<MyExam[]>([])
  const [loading, setLoading]       = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode]     = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('myExamViewMode') as 'grid' | 'list') || 'grid'
    }
    return 'grid'
  })

  useEffect(() => { fetchMyExams() }, [])

  useEffect(() => {
    localStorage.setItem('myExamViewMode', viewMode)
  }, [viewMode])

  const fetchMyExams = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/student/my-exams')
      if (!res.ok) throw new Error('Failed to fetch exams')
      const data = await res.json()
      setExams(data.exams)
    } catch (error: any) {
      console.error('Failed to fetch exams:', error)
      toast.error('Failed to load your exams')
    } finally {
      setLoading(false)
    }
  }

  const filteredExams = exams.filter(
    e =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.subject.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const attempted  = exams.filter(e => e.hasAttempted).length
  const notStarted = exams.length - attempted

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Exams</h1>
        <p className="mt-1 text-gray-600">
          {exams.length > 0
            ? `${exams.length} enrolled · ${attempted} attempted · ${notStarted} not started`
            : 'Quick access to all your enrolled exams'}
        </p>
      </div>

      {/* Search + View toggle */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search your exams..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Grid / List toggle */}
            <div className="flex gap-1 border rounded-md p-1 h-10 self-start flex-shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-2 rounded transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {searchQuery && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Found {filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
                Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty — no exams at all */}
      {!loading && exams.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={BookOpen}
              title="No exams yet"
              description="Browse our exam catalog and start your first exam to see it here"
              action={{ label: 'Browse Exams', onClick: () => router.push('/exams') }}
            />
          </CardContent>
        </Card>
      )}

      {/* Empty — no search results */}
      {!loading && exams.length > 0 && filteredExams.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={Search}
              title="No matching exams"
              description={`No exams found matching "${searchQuery}"`}
              action={{ label: 'Clear Search', onClick: () => setSearchQuery('') }}
            />
          </CardContent>
        </Card>
      )}

      {/* Grid view */}
      {!loading && filteredExams.length > 0 && viewMode === 'grid' && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam, index) => (
            <div
              key={exam.id}
              className="animate-scale-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <ExamGridCard
                exam={exam}
                onStart={() => router.push(`/exam/${exam.slug}/start`)}
              />
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {!loading && filteredExams.length > 0 && viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            {filteredExams.map(exam => (
              <ExamListRow
                key={exam.id}
                exam={exam}
                onStart={() => router.push(`/exam/${exam.slug}/start`)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Footer count */}
      {!loading && filteredExams.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          Showing {filteredExams.length} of {exams.length} exams
        </div>
      )}
    </div>
  )
}