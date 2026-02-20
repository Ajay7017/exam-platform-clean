// src/app/(admin)/admin/exams/new/page.tsx
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Loader2,
  Plus,
  X,
  Filter,
  BookOpen,
  Layers,
  Tag,
  ChevronRight,
  Search,
  CheckSquare,
  Square,
  Eye,
  Edit3,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Award,
  AlertCircle,
  BarChart3,
} from 'lucide-react'

// ─────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────

interface Subject {
  id: string
  name: string
  slug: string
}

interface Topic {
  id: string
  name: string
  subjectId: string
  subjectName: string
  questionsCount: number
}

interface SubTopic {
  id: string
  name: string
  topicId: string
  topicName: string
  subjectId: string
  questionsCount: number
}

interface Question {
  id: string
  statement: string
  topicId: string
  topicName: string
  subjectId: string
  subjectName: string
  subTopicId?: string
  subTopicName?: string
  difficulty: string
  marks: number
  negativeMarks: number
}

// Full question detail for preview
interface QuestionDetail {
  id: string
  statement: string
  imageUrl?: string | null
  topicId: string
  subTopicId?: string
  subjectId: string
  difficulty: string
  marks: number
  negativeMarks: number
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: 'A' | 'B' | 'C' | 'D'
  explanation?: string
  // enriched from allQuestions
  topicName?: string
  subTopicName?: string
  subjectName?: string
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const difficultyColor: Record<string, string> = {
  easy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  hard: 'bg-red-50 text-red-700 border-red-200',
}

const optionKeys = ['A', 'B', 'C', 'D'] as const

// ─────────────────────────────────────────────
// PREVIEW COMPONENT
// ─────────────────────────────────────────────

function ExamPreview({
  formData,
  questions,
  totalMarks,
  onEdit,
  onSubmit,
  submitting,
}: {
  formData: any
  questions: QuestionDetail[]
  totalMarks: number
  onEdit: () => void
  onSubmit: () => void
  submitting: boolean
}) {
  const [showAnswers, setShowAnswers] = useState(false)

  const diffStats = useMemo(() => ({
    easy: questions.filter(q => q.difficulty === 'easy').length,
    medium: questions.filter(q => q.difficulty === 'medium').length,
    hard: questions.filter(q => q.difficulty === 'hard').length,
  }), [questions])

  const negativeMarksTotal = useMemo(() =>
    questions.reduce((sum, q) => sum + (q.negativeMarks || 0), 0)
  , [questions])

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-gray-900 truncate">
                {formData.title || 'Untitled Exam'}
              </h1>
              <p className="text-xs text-gray-400">Preview — Check before creating</p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              {questions.length} questions
            </span>
            <span className="flex items-center gap-1">
              <Award className="h-3.5 w-3.5" />
              {totalMarks} marks
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formData.durationMin} min
            </span>
          </div>

          {/* Toggle answers */}
          <label className="hidden md:flex items-center gap-2 cursor-pointer shrink-0">
            <div
              className={`relative w-9 h-5 rounded-full transition-colors ${showAnswers ? 'bg-green-500' : 'bg-gray-300'}`}
              onClick={() => setShowAnswers(v => !v)}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showAnswers ? 'translate-x-4' : ''}`} />
            </div>
            <span className="text-xs text-gray-600 font-medium">Show answers</span>
          </label>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEdit}
              disabled={submitting}
              className="text-xs"
            >
              <Edit3 className="h-3.5 w-3.5 mr-1.5" />
              Edit Selection
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onSubmit}
              disabled={submitting}
              className="text-xs"
            >
              {submitting ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Creating...</>
              ) : (
                <><Plus className="h-3.5 w-3.5 mr-1.5" />Create Exam</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Exam summary card ── */}
      <div className="max-w-4xl mx-auto px-6 pt-6 pb-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h2 className="text-xl font-bold text-gray-900">{formData.title || 'Untitled Exam'}</h2>
                <Badge
                  variant="outline"
                  className={`capitalize text-xs ${difficultyColor[formData.difficulty]}`}
                >
                  {formData.difficulty}
                </Badge>
                {formData.isFree ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Free</Badge>
                ) : (
                  <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                    ₹{(formData.price / 100).toFixed(0)}
                  </Badge>
                )}
              </div>

              {formData.instructions && (
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{formData.instructions}</p>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
            {[
              { label: 'Questions', value: questions.length, icon: FileText, color: 'text-blue-600 bg-blue-50' },
              { label: 'Total Marks', value: totalMarks, icon: Award, color: 'text-purple-600 bg-purple-50' },
              { label: 'Duration', value: `${formData.durationMin} min`, icon: Clock, color: 'text-amber-600 bg-amber-50' },
              { label: 'Neg. Marks', value: `-${negativeMarksTotal}`, icon: AlertCircle, color: 'text-red-500 bg-red-50' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50">
                <div className={`p-1.5 rounded-md ${color.split(' ')[1]}`}>
                  <Icon className={`h-3.5 w-3.5 ${color.split(' ')[0]}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm font-semibold text-gray-800">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Difficulty distribution */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Difficulty Distribution</span>
            </div>
            <div className="flex gap-3 flex-wrap">
              {diffStats.easy > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                  {diffStats.easy} Easy
                </span>
              )}
              {diffStats.medium > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                  {diffStats.medium} Medium
                </span>
              )}
              {diffStats.hard > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 font-medium">
                  {diffStats.hard} Hard
                </span>
              )}
            </div>
          </div>

          {/* Settings row */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-4 flex-wrap text-xs text-gray-500">
            <span className={formData.randomizeOrder ? 'text-blue-600' : ''}>
              {formData.randomizeOrder ? '✓' : '✗'} Randomized order
            </span>
            <span className={formData.allowReview ? 'text-blue-600' : ''}>
              {formData.allowReview ? '✓' : '✗'} Review before submit
            </span>
          </div>
        </div>

        {/* ── Mobile toggle answers ── */}
        <div className="md:hidden flex items-center gap-2 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              className={`relative w-9 h-5 rounded-full transition-colors ${showAnswers ? 'bg-green-500' : 'bg-gray-300'}`}
              onClick={() => setShowAnswers(v => !v)}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showAnswers ? 'translate-x-4' : ''}`} />
            </div>
            <span className="text-sm text-gray-600 font-medium">Show correct answers</span>
          </label>
        </div>

        {/* ── Questions ── */}
        <div className="space-y-4">
          {questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              showAnswer={showAnswers}
            />
          ))}
        </div>

        {/* ── Bottom action bar ── */}
        <div className="sticky bottom-0 mt-6 -mx-6 px-6 py-4 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-900">{questions.length} questions</span>
              {' · '}
              <span className="font-semibold text-gray-900">{totalMarks} marks</span>
              {' · '}
              <span className="font-semibold text-gray-900">{formData.durationMin} min</span>
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onEdit} disabled={submitting}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Selection
              </Button>
              <Button onClick={onSubmit} disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
                ) : (
                  <><Plus className="h-4 w-4 mr-2" />Create Exam</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// QUESTION CARD (used in preview)
// ─────────────────────────────────────────────

function QuestionCard({
  question,
  index,
  showAnswer,
}: {
  question: QuestionDetail
  index: number
  showAnswer: boolean
}) {
  const options: { key: typeof optionKeys[number]; text: string }[] = [
    { key: 'A', text: question.optionA },
    { key: 'B', text: question.optionB },
    { key: 'C', text: question.optionC },
    { key: 'D', text: question.optionD },
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Question header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start gap-3">
          {/* Q number */}
          <div className="shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold mt-0.5">
            {index + 1}
          </div>

          <div className="flex-1 min-w-0">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 flex-wrap mb-2">
              {question.subjectName && (
                <>
                  <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-medium">
                    {question.subjectName}
                  </span>
                  <ChevronRight className="h-3 w-3 text-gray-300" />
                </>
              )}
              {question.topicName && (
                <>
                  <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Layers className="h-2.5 w-2.5" />
                    {question.topicName}
                  </span>
                </>
              )}
              {question.subTopicName && (
                <>
                  <ChevronRight className="h-3 w-3 text-gray-300" />
                  <span className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 flex items-center gap-1">
                    <Tag className="h-2.5 w-2.5" />
                    {question.subTopicName}
                  </span>
                </>
              )}
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${difficultyColor[question.difficulty] || ''}`}>
                {question.difficulty}
              </span>
            </div>

            {/* Statement */}
            <p
              className="text-sm text-gray-900 leading-relaxed font-medium [&_p]:inline [&_*]:inline"
              dangerouslySetInnerHTML={{ __html: question.statement }}
            />

            {/* Image */}
            {question.imageUrl && (
              <div className="mt-3 rounded-lg overflow-hidden border border-gray-100 max-w-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={question.imageUrl}
                  alt={`Question ${index + 1} image`}
                  className="w-full object-contain max-h-48"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="px-5 pb-4 space-y-2">
        {options.map(({ key, text }) => {
          const isCorrect = key === question.correctAnswer
          const showHighlight = showAnswer && isCorrect

          return (
            <div
              key={key}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors ${
                showHighlight
                  ? 'bg-emerald-50 border-emerald-300'
                  : 'bg-gray-50 border-gray-100'
              }`}
            >
              {/* Option key bubble */}
              <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                showHighlight
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}>
                {key}
              </div>

              <p
                className={`text-sm flex-1 [&_p]:inline [&_*]:inline ${showHighlight ? 'text-emerald-800 font-medium' : 'text-gray-700'}`}
                dangerouslySetInnerHTML={{ __html: text }}
              />

              {showHighlight && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              )}
            </div>
          )
        })}
      </div>

      {/* Footer: marks + explanation */}
      <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/60 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-emerald-600 font-semibold">+{question.marks} marks</span>
          {question.negativeMarks > 0 && (
            <span className="text-red-500 font-semibold">-{question.negativeMarks} negative</span>
          )}
        </div>

        {question.explanation && showAnswer && (
          <div className="w-full mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              Explanation
            </p>
            <p
                className="text-xs text-blue-800 leading-relaxed [&_p]:inline [&_*]:inline"
                dangerouslySetInnerHTML={{ __html: question.explanation }}
              />
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────

export default function CreateExamPage() {
  const router = useRouter()

  // ── View state ──
  const [view, setView] = useState<'form' | 'preview'>('form')
  const [previewQuestions, setPreviewQuestions] = useState<QuestionDetail[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)

  // ── Data state ──
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [allTopics, setAllTopics] = useState<Topic[]>([])
  const [allSubTopics, setAllSubTopics] = useState<SubTopic[]>([])
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])

  // ── Loading states ──
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [loadingSubTopics, setLoadingSubTopics] = useState(false)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // ── Form state ──
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    isMultiSubject: false,
    subjectId: '',
    selectedSubjects: [] as string[],
    durationMin: 60,
    price: 0,
    isFree: true,
    instructions: '',
    randomizeOrder: false,
    allowReview: true,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    thumbnail: '',
  })

  // ── Filter state ──
  const [filterSubject, setFilterSubject] = useState<string>('all')
  const [filterTopic, setFilterTopic] = useState<string>('all')
  const [filterSubTopic, setFilterSubTopic] = useState<string>('all')
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // ─────────────────────────────────────────────
  // FETCH: Subjects
  // ─────────────────────────────────────────────

  useEffect(() => {
    const fetchSubjects = async () => {
      setLoadingSubjects(true)
      try {
        const res = await fetch('/api/admin/subjects')
        if (!res.ok) throw new Error()
        const data = await res.json()
        setSubjects(data)
      } catch {
        toast.error('Failed to load subjects')
      } finally {
        setLoadingSubjects(false)
      }
    }
    fetchSubjects()
  }, [])

  // ─────────────────────────────────────────────
  // FETCH: Topics + Questions when subject changes
  // ─────────────────────────────────────────────

  useEffect(() => {
    const subjectIds = formData.isMultiSubject
      ? formData.selectedSubjects
      : formData.subjectId
      ? [formData.subjectId]
      : []

    if (subjectIds.length === 0) {
      setAllTopics([])
      setAllSubTopics([])
      setAllQuestions([])
      setSelectedQuestions([])
      resetFilters()
      return
    }

    const fetchAll = async () => {
      // Topics
      setLoadingTopics(true)
      try {
        const arrays = await Promise.all(
          subjectIds.map(id =>
            fetch(`/api/admin/topics?subjectId=${id}`).then(r => r.json())
          )
        )
        const flat: Topic[] = arrays.flat().map((t: any) => ({
          id: t.id,
          name: t.name,
          subjectId: t.subjectId,
          subjectName: subjects.find(s => s.id === t.subjectId)?.name || t.subjectName || '',
          questionsCount: t.questionsCount ?? 0,
        }))
        setAllTopics(flat)
      } catch {
        toast.error('Failed to load topics')
      } finally {
        setLoadingTopics(false)
      }

      // Questions
      setLoadingQuestions(true)
      try {
        const arrays = await Promise.all(
          subjectIds.map(id =>
            fetch(`/api/admin/questions?subjectId=${id}&limit=1000`).then(r => r.json())
          )
        )
        const flat = arrays.flatMap(d => d.questions || [])
        const unique = Array.from(
          new Map(flat.map((q: Question) => [q.id, q])).values()
        ) as Question[]
        setAllQuestions(unique)
      } catch {
        toast.error('Failed to load questions')
      } finally {
        setLoadingQuestions(false)
      }

      resetFilters()
    }

    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.isMultiSubject, formData.subjectId, formData.selectedSubjects])

  // ─────────────────────────────────────────────
  // FETCH: SubTopics when topic filter changes
  // ─────────────────────────────────────────────

  useEffect(() => {
    setFilterSubTopic('all')
    setAllSubTopics([])
    if (filterTopic === 'all') return

    const fetch_ = async () => {
      setLoadingSubTopics(true)
      try {
        const res = await fetch(`/api/admin/subtopics?topicId=${filterTopic}`)
        if (!res.ok) throw new Error()
        const data: SubTopic[] = await res.json()
        setAllSubTopics(data)
      } catch {
        toast.error('Failed to load subtopics')
      } finally {
        setLoadingSubTopics(false)
      }
    }
    fetch_()
  }, [filterTopic])

  // ─────────────────────────────────────────────
  // DERIVED: filtered questions
  // ─────────────────────────────────────────────

  const filteredQuestions = useMemo(() => {
    return allQuestions.filter(q => {
      if (filterSubject !== 'all' && q.subjectId !== filterSubject) return false
      if (filterTopic !== 'all' && q.topicId !== filterTopic) return false
      if (filterSubTopic !== 'all' && q.subTopicId !== filterSubTopic) return false
      if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) return false
      if (searchQuery.trim() && !q.statement.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [allQuestions, filterSubject, filterTopic, filterSubTopic, filterDifficulty, searchQuery])

  const visibleTopics = useMemo(() => {
    const ids = new Set(
      allQuestions
        .filter(q => filterSubject === 'all' || q.subjectId === filterSubject)
        .map(q => q.topicId)
    )
    return allTopics.filter(t => ids.has(t.id))
  }, [allTopics, allQuestions, filterSubject])

  const visibleSubTopics = useMemo(() => {
    if (filterTopic === 'all') return []
    const ids = new Set(
      allQuestions
        .filter(q => q.topicId === filterTopic && q.subTopicId)
        .map(q => q.subTopicId)
    )
    return allSubTopics.filter(st => ids.has(st.id))
  }, [allSubTopics, allQuestions, filterTopic])

  const availableSubjectsInQuestions = useMemo(() =>
    Array.from(new Set(allQuestions.map(q => q.subjectId))).map(id => ({
      id,
      name: allQuestions.find(q => q.subjectId === id)?.subjectName || '',
    }))
  , [allQuestions])

  const areAllFilteredSelected = useMemo(() => {
    if (filteredQuestions.length === 0) return false
    return filteredQuestions.every(q => selectedQuestions.includes(q.id))
  }, [filteredQuestions, selectedQuestions])

  const totalSelectedMarks = useMemo(() =>
    selectedQuestions.reduce((sum, id) => {
      const q = allQuestions.find(q => q.id === id)
      return sum + (q?.marks || 0)
    }, 0)
  , [selectedQuestions, allQuestions])

  // ─────────────────────────────────────────────
  // PREVIEW: fetch full details for selected questions
  // ─────────────────────────────────────────────

  const openPreview = useCallback(async () => {
    if (selectedQuestions.length < 2) {
      toast.error('Please select at least 2 questions')
      return
    }
    if (!formData.title.trim()) {
      toast.error('Please enter an exam title before previewing')
      return
    }

    setLoadingPreview(true)
    try {
      // Fetch all selected question details in parallel
      const results = await Promise.all(
        selectedQuestions.map(id =>
          fetch(`/api/admin/questions/${id}`).then(r => r.json())
        )
      )

      const details: QuestionDetail[] = results.map((res, i) => {
        const q = res.question
        // Enrich with names from allQuestions
        const meta = allQuestions.find(aq => aq.id === selectedQuestions[i])
        return {
          ...q,
          topicName: meta?.topicName || '',
          subTopicName: meta?.subTopicName || '',
          subjectName: meta?.subjectName || '',
        }
      })

      setPreviewQuestions(details)
      setView('preview')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      toast.error('Failed to load question details for preview')
    } finally {
      setLoadingPreview(false)
    }
  }, [selectedQuestions, formData.title, allQuestions])

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  const resetFilters = () => {
    setFilterSubject('all')
    setFilterTopic('all')
    setFilterSubTopic('all')
    setFilterDifficulty('all')
    setSearchQuery('')
    setAllSubTopics([])
  }

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const handleTitleChange = (title: string) =>
    setFormData(prev => ({ ...prev, title, slug: generateSlug(title) }))

  const handlePriceChange = (price: number) =>
    setFormData(prev => ({ ...prev, price, isFree: price === 0 }))

  const handleMultiSubjectToggle = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isMultiSubject: checked, subjectId: '', selectedSubjects: [] }))
    setSelectedQuestions([])
  }

  const toggleSubject = (subjectId: string) =>
    setFormData(prev => ({
      ...prev,
      selectedSubjects: prev.selectedSubjects.includes(subjectId)
        ? prev.selectedSubjects.filter(id => id !== subjectId)
        : [...prev.selectedSubjects, subjectId],
    }))

  const removeSubject = (subjectId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedSubjects: prev.selectedSubjects.filter(id => id !== subjectId),
    }))
    setSelectedQuestions(prev =>
      prev.filter(id => allQuestions.find(q => q.id === id)?.subjectId !== subjectId)
    )
  }

  const toggleQuestion = useCallback((questionId: string) => {
    setSelectedQuestions(prev =>
      prev.includes(questionId) ? prev.filter(id => id !== questionId) : [...prev, questionId]
    )
  }, [])

  const selectAllInCurrentView = useCallback(() => {
    const ids = filteredQuestions.map(q => q.id)
    setSelectedQuestions(prev => {
      const allSelected = ids.every(id => prev.includes(id))
      if (allSelected) return prev.filter(id => !ids.includes(id))
      return [...prev, ...ids.filter(id => !prev.includes(id))]
    })
  }, [filteredQuestions])

  const activeFilterCount = [
    filterSubject !== 'all',
    filterTopic !== 'all',
    filterSubTopic !== 'all',
    filterDifficulty !== 'all',
    searchQuery.trim() !== '',
  ].filter(Boolean).length

  const hasSubjectSelected =
    (!formData.isMultiSubject && !!formData.subjectId) ||
    (formData.isMultiSubject && formData.selectedSubjects.length > 0)

  // ─────────────────────────────────────────────
  // SUBMIT
  // ─────────────────────────────────────────────

  const handleSubmit = async () => {
    if (selectedQuestions.length < 2) {
      toast.error('Please select at least 2 questions')
      return
    }
    if (!formData.isMultiSubject && !formData.subjectId) {
      toast.error('Please select a subject')
      return
    }
    if (formData.isMultiSubject && formData.selectedSubjects.length === 0) {
      toast.error('Please select at least one subject')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          slug: formData.slug,
          subjectId: formData.isMultiSubject ? undefined : formData.subjectId,
          isMultiSubject: formData.isMultiSubject,
          durationMin: formData.durationMin,
          questionIds: selectedQuestions,
          price: formData.price,
          isFree: formData.isFree,
          instructions: formData.instructions || undefined,
          randomizeOrder: formData.randomizeOrder,
          allowReview: formData.allowReview,
          difficulty: formData.difficulty,
          ...(formData.thumbnail && { thumbnail: formData.thumbnail }),
        }),
      })

      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch {
        throw new Error(`Server error: ${text.substring(0, 100)}`)
      }

      if (!res.ok) throw new Error(data.error || 'Failed to create exam')

      toast.success('Exam created successfully!')
      router.push('/admin/exams')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create exam')
    } finally {
      setSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────
  // RENDER: Preview mode
  // ─────────────────────────────────────────────

  if (view === 'preview') {
    return (
      <ExamPreview
        formData={formData}
        questions={previewQuestions}
        totalMarks={totalSelectedMarks}
        onEdit={() => {
          setView('form')
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    )
  }

  // ─────────────────────────────────────────────
  // RENDER: Form mode
  // ─────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push('/admin/exams')} className="mb-3 -ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Exams
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Create New Exam</h1>
          <p className="text-gray-500 text-sm mt-1">
            Set up a new exam with questions from your question bank
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">

          {/* ════════════════════════════════
              LEFT — Basic Info
          ════════════════════════════════ */}
          <div className="space-y-5">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">Basic Information</CardTitle>
                <CardDescription className="text-sm">Enter the basic details of your exam</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                <div>
                  <Label htmlFor="title" className="text-sm font-medium">Exam Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={e => handleTitleChange(e.target.value)}
                    placeholder="e.g., JEE Main Mock Test 1"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="slug" className="text-sm font-medium">Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="e.g., jee-main-mock-test-1"
                    className="mt-1"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">Auto-generated from title</p>
                </div>

                {/* Multi-Subject Toggle */}
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <Switch
                    id="multiSubject"
                    checked={formData.isMultiSubject}
                    onCheckedChange={handleMultiSubjectToggle}
                  />
                  <div>
                    <Label htmlFor="multiSubject" className="text-sm font-medium cursor-pointer">
                      Multi-Subject Exam
                    </Label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Enable to select questions from multiple subjects
                    </p>
                  </div>
                </div>

                {/* Subject */}
                {!formData.isMultiSubject ? (
                  <div>
                    <Label className="text-sm font-medium">Subject *</Label>
                    <Select
                      value={formData.subjectId}
                      onValueChange={value => setFormData(prev => ({ ...prev, subjectId: value }))}
                      disabled={loadingSubjects}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={loadingSubjects ? 'Loading...' : 'Select subject'} />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <Label className="text-sm font-medium">Subjects * (Select Multiple)</Label>
                    {formData.selectedSubjects.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
                        {formData.selectedSubjects.map(id => {
                          const s = subjects.find(s => s.id === id)
                          return (
                            <Badge key={id} variant="secondary" className="pl-2.5 pr-1 gap-1">
                              {s?.name}
                              <button
                                type="button"
                                onClick={() => removeSubject(id)}
                                className="rounded-full hover:bg-gray-300 p-0.5 transition-colors"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </Badge>
                          )
                        })}
                      </div>
                    )}
                    <Select onValueChange={toggleSubject} disabled={loadingSubjects}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Add subjects..." />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects
                          .filter(s => !formData.selectedSubjects.includes(s.id))
                          .map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Duration + Difficulty */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="duration" className="text-sm font-medium">Duration (min) *</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="15"
                      max="300"
                      value={formData.durationMin}
                      onChange={e => setFormData(prev => ({ ...prev, durationMin: parseInt(e.target.value) }))}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Difficulty</Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(v: any) => setFormData(prev => ({ ...prev, difficulty: v }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Price */}
                <div>
                  <Label htmlFor="price" className="text-sm font-medium">Price (₹)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    value={formData.price / 100}
                    onChange={e => handlePriceChange(parseFloat(e.target.value) * 100)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-400 mt-1">Set to 0 for free exam</p>
                </div>

                {/* Instructions */}
                <div>
                  <Label htmlFor="instructions" className="text-sm font-medium">Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={formData.instructions}
                    onChange={e => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                    placeholder="Enter exam instructions..."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                {/* Checkboxes */}
                <div className="space-y-2.5 pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={formData.randomizeOrder}
                      onChange={e => setFormData(prev => ({ ...prev, randomizeOrder: e.target.checked }))}
                    />
                    <span className="text-sm text-gray-700">Randomize question order</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={formData.allowReview}
                      onChange={e => setFormData(prev => ({ ...prev, allowReview: e.target.checked }))}
                    />
                    <span className="text-sm text-gray-700">Allow review before submit</span>
                  </label>
                </div>

              </CardContent>
            </Card>
          </div>

          {/* ════════════════════════════════
              RIGHT — Question Bank
          ════════════════════════════════ */}
          <div className="space-y-4">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Select Questions
                      {selectedQuestions.length > 0 && (
                        <span className="ml-2 text-sm font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          {selectedQuestions.length} selected
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Choose questions from your question bank
                    </CardDescription>
                  </div>
                  {filteredQuestions.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAllInCurrentView}
                      className="shrink-0 text-xs"
                    >
                      {areAllFilteredSelected ? (
                        <><CheckSquare className="h-3.5 w-3.5 mr-1.5" />Deselect All</>
                      ) : (
                        <><Square className="h-3.5 w-3.5 mr-1.5" />Select All</>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {!hasSubjectSelected ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <BookOpen className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm font-medium">
                      Select {formData.isMultiSubject ? 'subjects' : 'a subject'} to load questions
                    </p>
                    <p className="text-xs mt-1 opacity-70">
                      Questions will appear here once you pick a subject
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">

                    {/* Filters */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                          <Filter className="h-3.5 w-3.5" />
                          Filters
                          {activeFilterCount > 0 && (
                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-xs">
                              {activeFilterCount} active
                            </span>
                          )}
                        </div>
                        {activeFilterCount > 0 && (
                          <button
                            type="button"
                            onClick={resetFilters}
                            className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2 transition-colors"
                          >
                            Clear all
                          </button>
                        )}
                      </div>

                      {/* Breadcrumb trail */}
                      {(filterSubject !== 'all' || filterTopic !== 'all') && (
                        <div className="flex items-center gap-1 flex-wrap text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                          <span className="text-gray-400">Showing:</span>
                          {filterSubject !== 'all' && (
                            <>
                              <ChevronRight className="h-3 w-3 opacity-40" />
                              <span className="font-medium text-gray-700">
                                {availableSubjectsInQuestions.find(s => s.id === filterSubject)?.name}
                              </span>
                            </>
                          )}
                          {filterTopic !== 'all' && (
                            <>
                              <ChevronRight className="h-3 w-3 opacity-40" />
                              <span className="font-medium text-gray-700">
                                {allTopics.find(t => t.id === filterTopic)?.name}
                              </span>
                            </>
                          )}
                          {filterSubTopic !== 'all' && (
                            <>
                              <ChevronRight className="h-3 w-3 opacity-40" />
                              <span className="font-medium text-gray-700">
                                {allSubTopics.find(st => st.id === filterSubTopic)?.name}
                              </span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Row 1: Subject + Topic */}
                      <div className={`grid gap-2 ${formData.isMultiSubject && availableSubjectsInQuestions.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {formData.isMultiSubject && availableSubjectsInQuestions.length > 1 && (
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <BookOpen className="h-3 w-3 text-gray-400" />
                              <Label className="text-xs text-gray-500">Subject</Label>
                            </div>
                            <Select
                              value={filterSubject}
                              onValueChange={v => { setFilterSubject(v); setFilterTopic('all'); setFilterSubTopic('all') }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Subjects ({allQuestions.length})</SelectItem>
                                {availableSubjectsInQuestions.map(s => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name} ({allQuestions.filter(q => q.subjectId === s.id).length})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Layers className="h-3 w-3 text-gray-400" />
                            <Label className="text-xs text-gray-500">Topic</Label>
                            {loadingTopics && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
                          </div>
                          <Select
                            value={filterTopic}
                            onValueChange={v => { setFilterTopic(v); setFilterSubTopic('all') }}
                            disabled={loadingTopics || visibleTopics.length === 0}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">
                                All Topics ({filterSubject === 'all' ? allQuestions.length : allQuestions.filter(q => q.subjectId === filterSubject).length})
                              </SelectItem>
                              {visibleTopics.map(t => {
                                const count = allQuestions.filter(q =>
                                  q.topicId === t.id && (filterSubject === 'all' || q.subjectId === filterSubject)
                                ).length
                                return (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.name}
                                    {formData.isMultiSubject && t.subjectName && ` (${t.subjectName})`}
                                    {' '}({count})
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Row 2: SubTopic + Difficulty */}
                      <div className={`grid gap-2 ${filterTopic !== 'all' && visibleSubTopics.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {filterTopic !== 'all' && visibleSubTopics.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <Tag className="h-3 w-3 text-gray-400" />
                              <Label className="text-xs text-gray-500">Sub-Topic</Label>
                              {loadingSubTopics && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
                            </div>
                            <Select
                              value={filterSubTopic}
                              onValueChange={setFilterSubTopic}
                              disabled={loadingSubTopics}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">
                                  All Sub-Topics ({allQuestions.filter(q => q.topicId === filterTopic).length})
                                </SelectItem>
                                {visibleSubTopics.map(st => {
                                  const count = allQuestions.filter(q => q.topicId === filterTopic && q.subTopicId === st.id).length
                                  return (
                                    <SelectItem key={st.id} value={st.id}>
                                      {st.name} ({count})
                                    </SelectItem>
                                  )
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Difficulty</Label>
                          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Difficulties ({filteredQuestions.length})</SelectItem>
                              <SelectItem value="easy">Easy ({filteredQuestions.filter(q => q.difficulty === 'easy').length})</SelectItem>
                              <SelectItem value="medium">Medium ({filteredQuestions.filter(q => q.difficulty === 'medium').length})</SelectItem>
                              <SelectItem value="hard">Hard ({filteredQuestions.filter(q => q.difficulty === 'hard').length})</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Search questions by keyword..."
                          className="w-full h-8 pl-8 pr-8 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {/* Results count */}
                      <div className="text-xs text-gray-500 flex items-center justify-between">
                        <span>
                          Showing <span className="font-semibold text-gray-700">{filteredQuestions.length}</span> of{' '}
                          <span className="font-semibold text-gray-700">{allQuestions.length}</span> questions
                        </span>
                        {selectedQuestions.length > 0 && (
                          <span className="text-blue-600 font-medium">{selectedQuestions.length} in exam</span>
                        )}
                      </div>
                    </div>

                    {/* Question List */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="max-h-[480px] overflow-y-auto divide-y divide-gray-100">
                        {loadingQuestions ? (
                          <div className="flex flex-col items-center justify-center py-12 gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                            <p className="text-sm text-gray-400">Loading questions...</p>
                          </div>
                        ) : filteredQuestions.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <Search className="h-8 w-8 mb-2 opacity-30" />
                            <p className="text-sm font-medium">No questions found</p>
                            <p className="text-xs mt-1 opacity-70">Try adjusting your filters</p>
                          </div>
                        ) : (
                          filteredQuestions.map(question => {
                            const isSelected = selectedQuestions.includes(question.id)
                            return (
                              <div
                                key={question.id}
                                className={`p-3 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 hover:bg-blue-100/80' : 'bg-white hover:bg-gray-50'}`}
                                onClick={() => toggleQuestion(question.id)}
                              >
                                <div className="flex items-start gap-2.5">
                                  <input
                                    type="checkbox"
                                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-200 cursor-pointer"
                                    checked={isSelected}
                                    onChange={() => toggleQuestion(question.id)}
                                    onClick={e => e.stopPropagation()}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p
                                      className="text-sm text-gray-800 line-clamp-2 leading-snug"
                                      dangerouslySetInnerHTML={{ __html: question.statement }}
                                    />
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                      {formData.isMultiSubject && (
                                        <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100 font-medium">
                                          {question.subjectName}
                                        </span>
                                      )}
                                      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                        <Layers className="h-2.5 w-2.5" />
                                        {question.topicName}
                                      </span>
                                      {question.subTopicName && (
                                        <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
                                          <Tag className="h-2.5 w-2.5" />
                                          {question.subTopicName}
                                        </span>
                                      )}
                                      <span className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded border font-medium capitalize ${difficultyColor[question.difficulty] || ''}`}>
                                        {question.difficulty}
                                      </span>
                                      <span className="text-xs text-gray-400">
                                        +{question.marks}
                                        {question.negativeMarks > 0 && (
                                          <span className="text-red-400">/-{question.negativeMarks}</span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>

                    {/* Selection summary */}
                    {selectedQuestions.length > 0 && (
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-sm font-medium text-blue-900">
                            {selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''} selected
                          </span>
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {formData.isMultiSubject && availableSubjectsInQuestions.map(s => {
                              const count = selectedQuestions.filter(id =>
                                allQuestions.find(q => q.id === id)?.subjectId === s.id
                              ).length
                              if (count === 0) return null
                              return (
                                <Badge key={s.id} variant="secondary" className="text-xs">
                                  {s.name}: {count}
                                </Badge>
                              )
                            })}
                            <Badge variant="outline" className="text-xs bg-white">
                              {totalSelectedMarks} marks total
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Bottom action buttons ── */}
        <div className="flex justify-end gap-3 mt-6 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/exams')}
            disabled={submitting || loadingPreview}
          >
            Cancel
          </Button>

          {/* Preview button — primary action */}
          <Button
            type="button"
            variant="outline"
            onClick={openPreview}
            disabled={selectedQuestions.length < 2 || loadingPreview || !formData.title.trim()}
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            {loadingPreview ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading Preview...</>
            ) : (
              <><Eye className="mr-2 h-4 w-4" />Preview ({selectedQuestions.length} questions)</>
            )}
          </Button>

          {/* Create directly (skip preview) */}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || loadingPreview || selectedQuestions.length < 2}
          >
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
            ) : (
              <><Plus className="mr-2 h-4 w-4" />Create Exam</>
            )}
          </Button>
        </div>

      </div>
    </div>
  )
}