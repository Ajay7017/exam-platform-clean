'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  ArrowLeft, Loader2, Save, X, Filter, BookOpen, Layers, Tag,
  ChevronRight, Search, CheckSquare, Square, ChevronLeft,
  GripVertical, Trash2, Check,
} from 'lucide-react'

import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ─────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────

interface Subject { id: string; name: string; slug: string }
interface Topic { id: string; name: string; subjectId: string; subjectName: string; questionsCount: number }
interface SubTopic { id: string; name: string; topicId: string; topicName: string; subjectId: string; questionsCount: number }

interface Question {
  id: string; statement: string; topicId: string; topicName: string
  subjectId: string; subjectName: string; subTopicId?: string; subTopicName?: string
  difficulty: string; marks: number; negativeMarks: number; questionType?: string
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const difficultyColor: Record<string, string> = {
  easy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  hard: 'bg-red-50 text-red-700 border-red-200',
}

const STEPS = [
  { n: 1, label: 'Exam Details' },
  { n: 2, label: 'Select Questions' },
]

// ─────────────────────────────────────────────
// WIZARD PROGRESS BAR
// ─────────────────────────────────────────────

function WizardBar({ step }: { step: number }) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-5xl mx-auto flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2 shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                step > s.n ? 'bg-green-500 text-white'
                : step === s.n ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-400'
              }`}>
                {step > s.n ? <Check className="w-4 h-4" /> : s.n}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${
                step === s.n ? 'text-blue-600' : step > s.n ? 'text-green-600' : 'text-gray-400'
              }`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 transition-colors ${step > s.n ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// SORTABLE QUESTION ROW
// ─────────────────────────────────────────────

function SortableQuestionRow({ question, index, onRemove }: { question: Question; index: number; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} className={`flex items-start gap-2 p-2.5 rounded-lg border bg-white text-xs group ${isDragging ? 'shadow-lg border-blue-300' : 'border-gray-100 hover:border-gray-200'}`}>
      <button type="button" className="mt-0.5 shrink-0 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-semibold text-xs mt-0.5">{index + 1}</span>
      <p className="flex-1 min-w-0 text-gray-700 line-clamp-2 leading-snug" dangerouslySetInnerHTML={{ __html: question.statement }} />
      <button type="button" onClick={() => onRemove(question.id)} className="shrink-0 text-gray-300 hover:text-red-500 transition-colors mt-0.5 opacity-0 group-hover:opacity-100">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export default function EditExamPage() {
  const router = useRouter()
  const params = useParams()
  const examId = params.id as string

  const [step, setStep] = useState(1)

  // ── Data ──
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [allTopics, setAllTopics] = useState<Topic[]>([])
  const [allSubTopics, setAllSubTopics] = useState<SubTopic[]>([])
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // ── Loading ──
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [loadingSubTopics, setLoadingSubTopics] = useState(false)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // ── Form ──
  const [formData, setFormData] = useState({
    title: '', slug: '', isMultiSubject: false, subjectId: '',
    selectedSubjects: [] as string[], durationMin: 60, price: 0,
    isFree: true, instructions: '', randomizeOrder: false,
    allowReview: true, difficulty: 'medium' as 'easy' | 'medium' | 'hard', thumbnail: '',
  })

  // ── Filters ──
  const [filterSubject, setFilterSubject] = useState('all')
  const [filterTopic, setFilterTopic] = useState('all')
  const [filterSubTopic, setFilterSubTopic] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [filterQuestionType, setFilterQuestionType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // ── DnD ──
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // ─────────────────────────────────────────────
  // FETCH: Subjects + Exam on mount
  // ─────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      setLoadingInitial(true)
      try {
        const [subjectsRes, examRes] = await Promise.all([
          fetch('/api/admin/subjects'),
          fetch(`/api/admin/exams/${examId}`),
        ])
        if (!subjectsRes.ok) throw new Error('Failed to fetch subjects')
        if (!examRes.ok) throw new Error('Failed to fetch exam')

        const subjectsData: Subject[] = await subjectsRes.json()
        const examData = await examRes.json()

        setSubjects(subjectsData)

        const isMulti = !examData.subject
        setFormData({
          title: examData.title, slug: examData.slug, isMultiSubject: isMulti,
          subjectId: examData.subject?.id || '', selectedSubjects: [],
          durationMin: examData.duration, price: examData.price, isFree: examData.isFree,
          instructions: examData.instructions || '', randomizeOrder: examData.randomizeOrder,
          allowReview: examData.allowReview, difficulty: examData.difficulty, thumbnail: examData.thumbnail || '',
        })

        setSelectedIds(examData.questions.map((q: any) => q.id))
      } catch {
        toast.error('Failed to load exam data')
        router.push('/admin/exams')
      } finally {
        setLoadingInitial(false)
      }
    }
    init()
  }, [examId])

  // ─────────────────────────────────────────────
  // FETCH: Topics + Questions when subject changes
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (loadingInitial) return

    const subjectIds = formData.isMultiSubject
      ? formData.selectedSubjects
      : formData.subjectId ? [formData.subjectId] : []

    if (subjectIds.length === 0) {
      setAllTopics([]); setAllSubTopics([]); setAllQuestions([]); resetFilters(); return
    }

    const fetchAll = async () => {
      setLoadingTopics(true)
      try {
        const arrays = await Promise.all(subjectIds.map(id => fetch(`/api/admin/topics?subjectId=${id}`).then(r => r.json())))
        const flat: Topic[] = arrays.flat().map((t: any) => ({
          id: t.id, name: t.name, subjectId: t.subjectId,
          subjectName: subjects.find(s => s.id === t.subjectId)?.name || t.subjectName || '',
          questionsCount: t.questionsCount ?? 0,
        }))
        setAllTopics(flat)
      } catch { toast.error('Failed to load topics') }
      finally { setLoadingTopics(false) }

      setLoadingQuestions(true)
      try {
        const arrays = await Promise.all(subjectIds.map(id => fetch(`/api/admin/questions?subjectId=${id}&limit=1000`).then(r => r.json())))
        const flat = arrays.flatMap(d => d.questions || [])
        const unique = Array.from(new Map(flat.map((q: Question) => [q.id, q])).values()) as Question[]
        setAllQuestions(unique)
      } catch { toast.error('Failed to load questions') }
      finally { setLoadingQuestions(false) }

      resetFilters()
    }
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.isMultiSubject, formData.subjectId, formData.selectedSubjects, loadingInitial])

  // ─────────────────────────────────────────────
  // FETCH: SubTopics
  // ─────────────────────────────────────────────

  useEffect(() => {
    setFilterSubTopic('all'); setAllSubTopics([])
    if (filterTopic === 'all') return
    const fetch_ = async () => {
      setLoadingSubTopics(true)
      try {
        const res = await fetch(`/api/admin/subtopics?topicId=${filterTopic}`)
        if (!res.ok) throw new Error()
        setAllSubTopics(await res.json())
      } catch { toast.error('Failed to load subtopics') }
      finally { setLoadingSubTopics(false) }
    }
    fetch_()
  }, [filterTopic])

  // ─────────────────────────────────────────────
  // DERIVED
  // ─────────────────────────────────────────────

  const filteredQuestions = useMemo(() => allQuestions.filter(q => {
    if (filterSubject !== 'all' && q.subjectId !== filterSubject) return false
    if (filterTopic !== 'all' && q.topicId !== filterTopic) return false
    if (filterSubTopic !== 'all' && q.subTopicId !== filterSubTopic) return false
    if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) return false
    if (filterQuestionType !== 'all' && q.questionType !== filterQuestionType) return false
    if (searchQuery.trim() && !q.statement.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  }), [allQuestions, filterSubject, filterTopic, filterSubTopic, filterDifficulty, filterQuestionType, searchQuery])

  const visibleTopics = useMemo(() => {
    const ids = new Set(allQuestions.filter(q => filterSubject === 'all' || q.subjectId === filterSubject).map(q => q.topicId))
    return allTopics.filter(t => ids.has(t.id))
  }, [allTopics, allQuestions, filterSubject])

  const visibleSubTopics = useMemo(() => {
    if (filterTopic === 'all') return []
    const ids = new Set(allQuestions.filter(q => q.topicId === filterTopic && q.subTopicId).map(q => q.subTopicId))
    return allSubTopics.filter(st => ids.has(st.id))
  }, [allSubTopics, allQuestions, filterTopic])

  const availableSubjectsInQuestions = useMemo(() =>
    Array.from(new Set(allQuestions.map(q => q.subjectId))).map(id => ({
      id, name: allQuestions.find(q => q.subjectId === id)?.subjectName || '',
    }))
  , [allQuestions])

  const areAllFilteredSelected = useMemo(() =>
    filteredQuestions.length > 0 && filteredQuestions.every(q => selectedIds.includes(q.id))
  , [filteredQuestions, selectedIds])

  const totalSelectedMarks = useMemo(() =>
    selectedIds.reduce((sum, id) => sum + (allQuestions.find(q => q.id === id)?.marks || 0), 0)
  , [selectedIds, allQuestions])

  const selectedQuestions = useMemo(() =>
    selectedIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean) as Question[]
  , [selectedIds, allQuestions])

  const activeFilterCount = [
    filterSubject !== 'all', filterTopic !== 'all', filterSubTopic !== 'all',
    filterDifficulty !== 'all', filterQuestionType !== 'all', searchQuery.trim() !== '',
  ].filter(Boolean).length

  const hasSubjectSelected =
    (!formData.isMultiSubject && !!formData.subjectId) ||
    (formData.isMultiSubject && formData.selectedSubjects.length > 0)

  const canProceedStep1 = formData.title.trim() && hasSubjectSelected
  const canSave = selectedIds.length >= 2

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  const resetFilters = () => {
    setFilterSubject('all'); setFilterTopic('all'); setFilterSubTopic('all')
    setFilterDifficulty('all'); setFilterQuestionType('all'); setSearchQuery(''); setAllSubTopics([])
  }

  const generateSlug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const handleTitleChange = (title: string) => setFormData(p => ({ ...p, title, slug: generateSlug(title) }))
  const handlePriceChange = (price: number) => setFormData(p => ({ ...p, price, isFree: price === 0 }))

  const handleMultiSubjectToggle = (checked: boolean) => {
    setFormData(p => ({ ...p, isMultiSubject: checked, subjectId: '', selectedSubjects: [] }))
    setSelectedIds([])
  }

  const toggleSubject = (id: string) => setFormData(p => ({
    ...p,
    selectedSubjects: p.selectedSubjects.includes(id)
      ? p.selectedSubjects.filter(s => s !== id)
      : [...p.selectedSubjects, id],
  }))

  const removeSubject = (id: string) => {
    setFormData(p => ({ ...p, selectedSubjects: p.selectedSubjects.filter(s => s !== id) }))
    setSelectedIds(p => p.filter(qid => allQuestions.find(q => q.id === qid)?.subjectId !== id))
  }

  const toggleQuestion = useCallback((id: string) => {
    setSelectedIds(p => p.includes(id) ? p.filter(q => q !== id) : [...p, id])
  }, [])

  const removeSelected = useCallback((id: string) => {
    setSelectedIds(p => p.filter(q => q !== id))
  }, [])

  const selectAllInCurrentView = useCallback(() => {
    const ids = filteredQuestions.map(q => q.id)
    setSelectedIds(p => {
      const allSel = ids.every(id => p.includes(id))
      return allSel ? p.filter(id => !ids.includes(id)) : [...p, ...ids.filter(id => !p.includes(id))]
    })
  }, [filteredQuestions])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setSelectedIds(ids => {
        const oldIndex = ids.indexOf(active.id as string)
        const newIndex = ids.indexOf(over.id as string)
        return arrayMove(ids, oldIndex, newIndex)
      })
    }
  }

  // ─────────────────────────────────────────────
  // SUBMIT
  // ─────────────────────────────────────────────

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (selectedIds.length < 2) { toast.error('Select at least 2 questions'); return }
    if (!formData.isMultiSubject && !formData.subjectId) { toast.error('Please select a subject'); return }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/exams/${examId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title, slug: formData.slug,
          subjectId: formData.isMultiSubject ? undefined : formData.subjectId,
          isMultiSubject: formData.isMultiSubject,
          durationMin: formData.durationMin, questionIds: selectedIds,
          price: formData.price, isFree: formData.isFree,
          instructions: formData.instructions || undefined,
          randomizeOrder: formData.randomizeOrder, allowReview: formData.allowReview,
          difficulty: formData.difficulty,
          ...(formData.thumbnail && { thumbnail: formData.thumbnail }),
        }),
      })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { throw new Error(`Server error: ${text.substring(0, 100)}`) }
      if (!res.ok) throw new Error(data.error || 'Failed to update exam')
      toast.success('Exam updated successfully!')
      router.push('/admin/exams')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update exam')
    } finally { setSubmitting(false) }
  }

  // ─────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────

  if (loadingInitial) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500">Loading exam data...</p>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">

      <WizardBar step={step} />

      <div className="px-6 pt-4 max-w-7xl mx-auto w-full">
        <Button variant="ghost" onClick={() => router.push('/admin/exams')} className="-ml-2 mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />Back to Exams
        </Button>
      </div>

      {/* ══════════════ STEP 1: EXAM DETAILS ══════════════ */}
      {step === 1 && (
        <div className="flex-1 px-6 pb-32 max-w-2xl mx-auto w-full">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Edit Exam</h1>
            <p className="text-gray-500 text-sm mt-1">Update the basic information for your exam</p>
          </div>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="pt-6 space-y-5">

              <div>
                <Label htmlFor="title" className="text-sm font-medium">Exam Title *</Label>
                <Input id="title" value={formData.title} onChange={e => handleTitleChange(e.target.value)} placeholder="e.g., JEE Main Mock Test 1" className="mt-1" />
              </div>

              <div>
                <Label htmlFor="slug" className="text-sm font-medium">Slug *</Label>
                <Input id="slug" value={formData.slug} onChange={e => setFormData(p => ({ ...p, slug: e.target.value }))} className="mt-1" />
                <p className="text-xs text-gray-400 mt-1">Auto-generated from title</p>
              </div>

              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Switch id="multiSubject" checked={formData.isMultiSubject} onCheckedChange={handleMultiSubjectToggle} />
                <div>
                  <Label htmlFor="multiSubject" className="text-sm font-medium cursor-pointer">Multi-Subject Exam</Label>
                  <p className="text-xs text-gray-500 mt-0.5">Enable to select questions from multiple subjects</p>
                </div>
              </div>

              {!formData.isMultiSubject ? (
                <div>
                  <Label className="text-sm font-medium">Subject *</Label>
                  <Select value={formData.subjectId} onValueChange={v => setFormData(p => ({ ...p, subjectId: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
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
                            <button type="button" onClick={() => removeSubject(id)} className="rounded-full hover:bg-gray-300 p-0.5"><X className="h-2.5 w-2.5" /></button>
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                  <Select onValueChange={toggleSubject}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Add subjects..." /></SelectTrigger>
                    <SelectContent>
                      {subjects.filter(s => !formData.selectedSubjects.includes(s.id)).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="duration" className="text-sm font-medium">Duration (min) *</Label>
                  <Input id="duration" type="number" min="15" max="300" value={formData.durationMin} onChange={e => setFormData(p => ({ ...p, durationMin: parseInt(e.target.value) }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Difficulty</Label>
                  <Select value={formData.difficulty} onValueChange={(v: any) => setFormData(p => ({ ...p, difficulty: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="price" className="text-sm font-medium">Price (₹)</Label>
                <Input id="price" type="number" min="0" value={formData.price / 100} onChange={e => handlePriceChange(parseFloat(e.target.value) * 100)} className="mt-1" />
                <p className="text-xs text-gray-400 mt-1">Set to 0 for free exam</p>
              </div>

              <div>
                <Label htmlFor="instructions" className="text-sm font-medium">Instructions</Label>
                <Textarea id="instructions" value={formData.instructions} onChange={e => setFormData(p => ({ ...p, instructions: e.target.value }))} placeholder="Enter exam instructions..." rows={3} className="mt-1" />
              </div>

              <div className="space-y-2.5 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={formData.randomizeOrder} onChange={e => setFormData(p => ({ ...p, randomizeOrder: e.target.checked }))} />
                  <span className="text-sm text-gray-700">Randomize question order</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={formData.allowReview} onChange={e => setFormData(p => ({ ...p, allowReview: e.target.checked }))} />
                  <span className="text-sm text-gray-700">Allow review before submit</span>
                </label>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════ STEP 2: SELECT QUESTIONS ══════════════ */}
      {step === 2 && (
        <div className="flex-1 px-6 pb-32 max-w-7xl mx-auto w-full">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Select Questions</h1>
            <p className="text-gray-500 text-sm mt-1">
              Editing <span className="font-semibold text-gray-700">{formData.title}</span>
              {formData.randomizeOrder && (
                <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Randomize ON — order won't matter for students
                </span>
              )}
            </p>
          </div>

          {!hasSubjectSelected ? (
            <Card className="border border-gray-200">
              <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
                <BookOpen className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">No subject selected</p>
                <Button variant="outline" className="mt-4" onClick={() => setStep(1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" />Back to Details
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-[220px_1fr_280px] gap-4 items-start">

              {/* ── LEFT: Filters ── */}
              <div className="sticky top-4 space-y-4">
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <Filter className="h-3.5 w-3.5" />Filters
                        {activeFilterCount > 0 && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>}
                      </div>
                      {activeFilterCount > 0 && (
                        <button type="button" onClick={resetFilters} className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">Clear</button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">

                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">Question Type</Label>
                      <Select value={filterQuestionType} onValueChange={setFilterQuestionType}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="mcq">MCQ</SelectItem>
                          <SelectItem value="numerical">Numerical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.isMultiSubject && availableSubjectsInQuestions.length > 1 && (
                      <div>
                        <div className="flex items-center gap-1 mb-1"><BookOpen className="h-3 w-3 text-gray-400" /><Label className="text-xs text-gray-500">Subject</Label></div>
                        <Select value={filterSubject} onValueChange={v => { setFilterSubject(v); setFilterTopic('all'); setFilterSubTopic('all') }}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All ({allQuestions.length})</SelectItem>
                            {availableSubjectsInQuestions.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({allQuestions.filter(q => q.subjectId === s.id).length})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Layers className="h-3 w-3 text-gray-400" /><Label className="text-xs text-gray-500">Topic</Label>
                        {loadingTopics && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
                      </div>
                      <Select value={filterTopic} onValueChange={v => { setFilterTopic(v); setFilterSubTopic('all') }} disabled={loadingTopics || visibleTopics.length === 0}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Topics</SelectItem>
                          {visibleTopics.map(t => {
                            const count = allQuestions.filter(q => q.topicId === t.id && (filterSubject === 'all' || q.subjectId === filterSubject)).length
                            return <SelectItem key={t.id} value={t.id}>{t.name} ({count})</SelectItem>
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {filterTopic !== 'all' && visibleSubTopics.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <Tag className="h-3 w-3 text-gray-400" /><Label className="text-xs text-gray-500">Sub-Topic</Label>
                          {loadingSubTopics && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
                        </div>
                        <Select value={filterSubTopic} onValueChange={setFilterSubTopic} disabled={loadingSubTopics}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Sub-Topics</SelectItem>
                            {visibleSubTopics.map(st => {
                              const count = allQuestions.filter(q => q.topicId === filterTopic && q.subTopicId === st.id).length
                              return <SelectItem key={st.id} value={st.id}>{st.name} ({count})</SelectItem>
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">Difficulty</Label>
                      <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All ({filteredQuestions.length})</SelectItem>
                          <SelectItem value="easy">Easy ({filteredQuestions.filter(q => q.difficulty === 'easy').length})</SelectItem>
                          <SelectItem value="medium">Medium ({filteredQuestions.filter(q => q.difficulty === 'medium').length})</SelectItem>
                          <SelectItem value="hard">Hard ({filteredQuestions.filter(q => q.difficulty === 'hard').length})</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(filterSubject !== 'all' || filterTopic !== 'all') && (
                      <div className="flex items-center gap-1 flex-wrap text-xs text-gray-500 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100">
                        <span className="text-gray-400">Showing:</span>
                        {filterSubject !== 'all' && <span className="font-medium text-gray-700">{availableSubjectsInQuestions.find(s => s.id === filterSubject)?.name}</span>}
                        {filterTopic !== 'all' && <><ChevronRight className="h-3 w-3 opacity-40" /><span className="font-medium text-gray-700">{allTopics.find(t => t.id === filterTopic)?.name}</span></>}
                        {filterSubTopic !== 'all' && <><ChevronRight className="h-3 w-3 opacity-40" /><span className="font-medium text-gray-700">{allSubTopics.find(st => st.id === filterSubTopic)?.name}</span></>}
                      </div>
                    )}

                  </CardContent>
                </Card>
              </div>

              {/* ── CENTER: Question list ── */}
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                      <input
                        type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search questions..."
                        className="w-full h-8 pl-8 pr-8 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                      />
                      {searchQuery && (
                        <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                      )}
                    </div>
                    {filteredQuestions.length > 0 && (
                      <Button type="button" variant="outline" size="sm" onClick={selectAllInCurrentView} className="shrink-0 text-xs h-8">
                        {areAllFilteredSelected ? <><CheckSquare className="h-3.5 w-3.5 mr-1" />Deselect All</> : <><Square className="h-3.5 w-3.5 mr-1" />Select All</>}
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                    <span>Showing <strong className="text-gray-700">{filteredQuestions.length}</strong> of <strong className="text-gray-700">{allQuestions.length}</strong> questions</span>
                    {selectedIds.length > 0 && <span className="text-blue-600 font-medium">{selectedIds.length} in exam</span>}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100">
                    {loadingQuestions ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                        <p className="text-sm text-gray-400">Loading questions...</p>
                      </div>
                    ) : filteredQuestions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <Search className="h-8 w-8 mb-2 opacity-30" />
                        <p className="text-sm font-medium">No questions found</p>
                        <p className="text-xs mt-1 opacity-70">Try adjusting your filters</p>
                      </div>
                    ) : (
                      filteredQuestions.map(question => {
                        const isSelected = selectedIds.includes(question.id)
                        return (
                          <div key={question.id} className={`p-3 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 hover:bg-blue-100/80' : 'bg-white hover:bg-gray-50'}`} onClick={() => toggleQuestion(question.id)}>
                            <div className="flex items-start gap-2.5">
                              <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 cursor-pointer" checked={isSelected} onChange={() => toggleQuestion(question.id)} onClick={e => e.stopPropagation()} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800 line-clamp-2 leading-snug" dangerouslySetInnerHTML={{ __html: question.statement }} />
                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                  {question.questionType === 'numerical'
                                    ? <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-medium"># Numerical</span>
                                    : <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100 font-medium">≡ MCQ</span>
                                  }
                                  {formData.isMultiSubject && <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100 font-medium">{question.subjectName}</span>}
                                  <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600"><Layers className="h-2.5 w-2.5" />{question.topicName}</span>
                                  {question.subTopicName && <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100"><Tag className="h-2.5 w-2.5" />{question.subTopicName}</span>}
                                  <span className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded border font-medium capitalize ${difficultyColor[question.difficulty] || ''}`}>{question.difficulty}</span>
                                  <span className="text-xs text-gray-400">+{question.marks}{question.negativeMarks > 0 && <span className="text-red-400">/-{question.negativeMarks}</span>}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ── RIGHT: Selected panel ── */}
              <div className="sticky top-4">
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">
                        Selected
                        <span className="ml-1.5 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full text-xs font-medium">{selectedIds.length}</span>
                      </CardTitle>
                      <span className="text-xs text-gray-500 font-medium">{totalSelectedMarks} marks</span>
                    </div>
                    {selectedIds.length > 0 && !formData.randomizeOrder && <p className="text-xs text-gray-400 mt-1">Drag to reorder</p>}
                    {selectedIds.length > 0 && formData.randomizeOrder && <p className="text-xs text-amber-500 mt-1">Order randomized for students</p>}
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {selectedIds.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                        <CheckSquare className="h-8 w-8 mb-2" />
                        <p className="text-xs text-center">No questions selected.<br />Click questions to add them.</p>
                      </div>
                    ) : (
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={selectedIds} strategy={verticalListSortingStrategy}>
                          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-0.5">
                            {selectedQuestions.map((q, i) => (
                              <SortableQuestionRow key={q.id} question={q} index={i} onRemove={removeSelected} />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                    {selectedIds.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 flex-wrap">
                        {['easy', 'medium', 'hard'].map(d => {
                          const count = selectedQuestions.filter(q => q.difficulty === d).length
                          if (count === 0) return null
                          return <span key={d} className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${difficultyColor[d]}`}>{count} {d}</span>
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ══════════════ STICKY BOTTOM BAR ══════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-lg lg:left-64">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {step === 2 && selectedIds.length > 0 && (
              <>
                <span><strong className="text-gray-900">{selectedIds.length}</strong> questions</span>
                <span className="text-gray-300">·</span>
                <span><strong className="text-gray-900">{totalSelectedMarks}</strong> marks</span>
                <span className="text-gray-300">·</span>
                <span><strong className="text-gray-900">{formData.durationMin}</strong> min</span>
              </>
            )}
            {step === 1 && <span className="text-gray-500 text-xs">Update exam details then proceed to questions</span>}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push('/admin/exams')} disabled={submitting}>Cancel</Button>

            {step === 2 && (
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />Back
              </Button>
            )}

            {step === 1 && (
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Next: Select Questions <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {step === 2 && (
              <Button onClick={handleSubmit} disabled={!canSave || submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Changes</>}
              </Button>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}