// src/app/(admin)/admin/questions/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SafeHtml } from '@/lib/utils/safe-html'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { QuestionForm } from '@/components/admin/QuestionForm'
import { toast } from 'sonner'
import {
  Loader2, Upload, Search, Eye, Edit, Trash2, Plus, CheckCircle2,
  ToggleLeft, ToggleRight, X, LayoutList, Rows3, ClipboardList, Tag, ChevronDown,
  FileDown, BookOpen, ChevronUp,
} from 'lucide-react'

// ─────────────────────────────────────────────
// SEARCHABLE SELECT COMPONENT — untouched
// ─────────────────────────────────────────────
interface SearchableSelectOption {
  value: string
  label: string
}

function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Select...',
  disabled = false,
  allLabel = 'All',
  allValue = 'all',
}: {
  options: SearchableSelectOption[]
  value: string
  onValueChange: (val: string) => void
  placeholder?: string
  disabled?: boolean
  allLabel?: string
  allValue?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )

  const selectedLabel = value === allValue
    ? allLabel
    : options.find(o => o.value === value)?.label ?? placeholder

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const handleSelect = (val: string) => {
    onValueChange(val)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={value === allValue ? 'text-muted-foreground' : 'text-foreground'}>
          {selectedLabel}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded border border-gray-200 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => handleSelect(allValue)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                value === allValue ? 'text-blue-600 font-medium bg-blue-50' : 'text-gray-700'
              }`}
            >
              {value === allValue && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
              <span className={value === allValue ? '' : 'pl-5'}>{allLabel}</span>
            </button>
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-center text-gray-400">No results found</p>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                    value === opt.value ? 'text-blue-600 font-medium bg-blue-50' : 'text-gray-700'
                  }`}
                >
                  {value === opt.value
                    ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    : <span className="w-3.5 shrink-0" />
                  }
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// TAG INPUT COMPONENT — untouched
// ─────────────────────────────────────────────
function TagInput({
  tags,
  onChange,
  existingTags,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  existingTags: string[]
}) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const suggestions = existingTags.filter(
    t => t.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(t)
  )

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed || tags.includes(trimmed)) return
    onChange([...tags, trimmed])
    setInputValue('')
    setShowSuggestions(false)
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    }
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div className="relative">
      <div
        className="min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 flex flex-wrap gap-1.5 cursor-text"
        onClick={() => document.getElementById('quick-tag-input')?.focus()}
      >
        {tags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
            {tag}
            <button type="button" onClick={e => { e.stopPropagation(); removeTag(tag) }} className="hover:text-red-500 transition-colors ml-0.5">
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          id="quick-tag-input"
          type="text"
          value={inputValue}
          onChange={e => { setInputValue(e.target.value); setShowSuggestions(true) }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={tags.length === 0 ? 'Type category (e.g. NEET)' : ''}
          className="flex-1 min-w-[140px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {showSuggestions && (inputValue || suggestions.length > 0) && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
          {suggestions.map(tag => (
            <button key={tag} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" onMouseDown={() => addTag(tag)}>
              <Tag className="h-3 w-3 text-gray-400" /> {tag}
              <span className="ml-auto text-xs text-gray-400">existing</span>
            </button>
          ))}
          {inputValue.trim() && !tags.includes(inputValue.trim()) && !existingTags.includes(inputValue.trim()) && (
            <button type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-blue-700 flex items-center gap-2 border-t border-gray-100" onMouseDown={() => addTag(inputValue)}>
              <Plus className="h-3 w-3" /> Create "{inputValue.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// ✅ NEW: UsedInExams inline accordion component
// Self-contained — receives the exam list, manages its own open state
// ─────────────────────────────────────────────
function UsedInExams({ exams }: { exams: { id: string; title: string }[] }) {
  const [open, setOpen] = useState(false)
  const count = exams.length

  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
        <BookOpen className="w-3 h-3" />
        Not used in any exam
      </span>
    )
  }

  return (
    <div className="inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${
          open
            ? 'bg-amber-50 border-amber-300 text-amber-700'
            : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
        }`}
      >
        <BookOpen className="w-3 h-3" />
        Used in {count} exam{count !== 1 ? 's' : ''}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            This question is used in:
          </p>
          <ul className="space-y-1">
            {exams.map(exam => (
              <li key={exam.id} className="flex items-start gap-2 text-xs text-amber-900">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                {exam.title}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Helpers — untouched
// ─────────────────────────────────────────────
function stripHtml(html: string) {
  return html
    .replace(/<math-node[^>]*><\/math-node>/g, '[Math]')
    .replace(/<[^>]*>/g, '')
    .trim()
}

function getTypeBadge(type?: 'mcq' | 'numerical' | 'match') {
  if (type === 'numerical') {
    return <Badge className="bg-blue-100 text-blue-800 text-[10px] sm:text-xs font-medium"># Numerical</Badge>
  }
  if (type === 'match') {
    return <Badge className="bg-violet-100 text-violet-800 text-[10px] sm:text-xs font-medium">⇌ Match</Badge>
  }
  return <Badge className="bg-purple-100 text-purple-800 text-[10px] sm:text-xs font-medium">≡ MCQ</Badge>
}

const sortByName = <T extends { name: string }>(arr: T[]): T[] =>
  [...arr].sort((a, b) => a.name.localeCompare(b.name))

interface Subject { id: string; name: string }
interface Topic { id: string; name: string; subjectId: string }
interface SubTopic { id: string; name: string; topicId: string }

interface Question {
  id: string
  statement: string
  topicName: string
  subTopicName?: string
  subjectName: string
  marks: number
  negativeMarks: number
  difficulty: string
  isActive: boolean
  createdAt: string
  questionType?: 'mcq' | 'numerical' | 'match'
  // ✅ NEW: exam usage data from API
  usedInExams: { id: string; title: string }[]
}

interface QuestionDetail extends Question {
  topic: string
  subject: string
  subTopic?: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: string
  explanation?: string
  questionType?: 'mcq' | 'numerical' | 'match'
  correctAnswerExact?: number | null
  correctAnswerMin?: number | null
  correctAnswerMax?: number | null
  matchPairs?: {
    leftColumn: { header: string; items: string[] }
    rightColumn: { header: string; items: string[] }
  } | null
}

export default function AdminQuestionsPage() {
  const router = useRouter()

  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState('all')
  const [subjectId, setSubjectId] = useState('all')
  const [topicId, setTopicId] = useState('all')
  const [subTopicId, setSubTopicId] = useState('all')
  const [questionType, setQuestionType] = useState('all')

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([])
  const [subTopics, setSubTopics] = useState<SubTopic[]>([])
  const [filteredSubTopics, setFilteredSubTopics] = useState<SubTopic[]>([])

  const [existingTags, setExistingTags] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  const [quickExamDialogOpen, setQuickExamDialogOpen] = useState(false)
  const [quickExamData, setQuickExamData] = useState({
    title: '',
    durationMin: '60',
    price: 0,
    isFree: true,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    randomizeOrder: true,
    allowReview: true,
    tags: [] as string[]
  })
  const [quickExamLoading, setQuickExamLoading] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [exportStatus, setExportStatus] = useState('')
  const [limit, setLimit] = useState(20)

  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewQuestion, setViewQuestion] = useState<QuestionDetail | null>(null)
  const [loadingView, setLoadingView] = useState(false)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editQuestionId, setEditQuestionId] = useState<string | null>(null)
  const [editQuestionData, setEditQuestionData] = useState<any>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null)
  const [deleteQuestionName, setDeleteQuestionName] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchSubjects()
    fetchTopics()
    fetchAllSubTopics()
    fetchExistingTags()
  }, [])

  useEffect(() => {
    if (subjectId === 'all') {
      setFilteredTopics(topics)
    } else {
      setFilteredTopics(topics.filter(t => t.subjectId === subjectId))
    }
    setTopicId('all')
    setSubTopicId('all')
  }, [subjectId, topics])

  useEffect(() => {
    if (topicId === 'all') {
      setFilteredSubTopics(subTopics)
    } else {
      setFilteredSubTopics(subTopics.filter(st => st.topicId === topicId))
    }
    setSubTopicId('all')
  }, [topicId, subTopics])

  useEffect(() => { fetchQuestions() }, [page, difficulty, subjectId, topicId, subTopicId, questionType, limit])
  useEffect(() => { setSelectedIds(new Set()) }, [page, difficulty, subjectId, topicId, subTopicId, questionType])

  const fetchSubjects = async () => {
    try {
      const res = await fetch('/api/admin/subjects')
      if (!res.ok) return
      const data = await res.json()
      setSubjects(sortByName(data.subjects || data || []))
    } catch (e) { console.error('Failed to fetch subjects', e) }
  }

  const fetchTopics = async () => {
    try {
      const res = await fetch('/api/admin/topics')
      if (!res.ok) return
      const data = await res.json()
      const list = sortByName(data.topics || data || []) as Topic[]
      setTopics(list)
      setFilteredTopics(list)
    } catch (e) { console.error('Failed to fetch topics', e) }
  }

  const fetchAllSubTopics = async () => {
    try {
      const res = await fetch('/api/admin/subtopics')
      if (!res.ok) return
      const data = await res.json()
      const list = sortByName(data || []) as SubTopic[]
      setSubTopics(list)
      setFilteredSubTopics(list)
    } catch (e) { console.error('Failed to fetch subtopics', e) }
  }

  const fetchExistingTags = async () => {
    try {
      const res = await fetch('/api/admin/exams?limit=1')
      if (!res.ok) return
      const data = await res.json()
      if (data.allTags) setExistingTags(data.allTags)
    } catch { /* silently fail */ }
  }

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() })
      if (difficulty !== 'all') params.append('difficulty', difficulty)
      if (search) params.append('search', search)
      if (subjectId !== 'all') params.append('subjectId', subjectId)
      if (topicId !== 'all') params.append('topicId', topicId)
      if (subTopicId !== 'all') params.append('subTopicId', subTopicId)
      if (questionType !== 'all') params.append('questionType', questionType)

      const response = await fetch(`/api/admin/questions?${params}`)
      if (!response.ok) throw new Error('Failed to fetch questions')
      const data = await response.json()
      setQuestions(data.questions || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotal(data.pagination?.total || 0)
    } catch (error) {
      toast.error('Failed to load questions')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => { setPage(1); fetchQuestions() }

  const handleClearFilters = () => {
    setSearch('')
    setDifficulty('all')
    setSubjectId('all')
    setTopicId('all')
    setSubTopicId('all')
    setQuestionType('all')
    setPage(1)
  }

  const hasActiveFilters = search || difficulty !== 'all' || subjectId !== 'all' || topicId !== 'all' || subTopicId !== 'all' || questionType !== 'all'

  const allCurrentIds = questions.map(q => q.id)
  const allSelected = allCurrentIds.length > 0 && allCurrentIds.every(id => selectedIds.has(id))
  const someSelected = selectedIds.size > 0

  const handleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(allCurrentIds))
  }

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handleInlineToggle = async (question: Question) => {
    setTogglingId(question.id)
    try {
      const res = await fetch(`/api/admin/questions/${question.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !question.isActive }),
      })
      if (!res.ok) throw new Error()
      setQuestions(prev =>
        prev.map(q => q.id === question.id ? { ...q, isActive: !q.isActive } : q)
      )
      toast.success(`Question marked as ${!question.isActive ? 'Active' : 'Inactive'}`)
    } catch {
      toast.error('Failed to update status')
    } finally {
      setTogglingId(null)
    }
  }

  const handleBulkToggle = async (isActive: boolean) => {
    setBulkActionLoading(true)
    try {
      const res = await fetch('/api/admin/questions/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), isActive }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(data.message)
      setSelectedIds(new Set())
      fetchQuestions()
    } catch (e: any) {
      toast.error(e.message || 'Failed to update questions')
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleBulkDeleteConfirm = async () => {
    setBulkActionLoading(true)
    try {
      const res = await fetch('/api/admin/questions/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(data.message)
      setSelectedIds(new Set())
      setBulkDeleteDialogOpen(false)
      fetchQuestions()
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete questions')
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleExportPdf = async () => {
    setExportLoading(true)
    setExportStatus('Preparing export…')
    try {
      const { exportQuestionsToPdf } = await import('@/lib/utils/pdf-export')
      await exportQuestionsToPdf(
        Array.from(selectedIds),
        (status) => setExportStatus(status)
      )
      toast.success(`PDF exported — ${selectedIds.size} question${selectedIds.size !== 1 ? 's' : ''}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to export PDF')
    } finally {
      setExportLoading(false)
      setExportStatus('')
    }
  }

  const handleQuickCreateExam = async () => {
    if (!quickExamData.title.trim() || !quickExamData.durationMin) {
      toast.error("Please provide a title and duration")
      return
    }
    setQuickExamLoading(true)
    try {
      const slug = quickExamData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const payload = {
        title: quickExamData.title,
        slug,
        isMultiSubject: true,
        durationMin: parseInt(quickExamData.durationMin) || 60,
        questionIds: Array.from(selectedIds),
        price: quickExamData.price,
        isFree: quickExamData.isFree || quickExamData.price === 0,
        difficulty: quickExamData.difficulty,
        allowReview: quickExamData.allowReview,
        randomizeOrder: quickExamData.randomizeOrder,
        tags: quickExamData.tags,
        isPublished: false,
      }
      const res = await fetch('/api/admin/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create exam')
      toast.success('Exam created successfully!')
      setQuickExamDialogOpen(false)
      setSelectedIds(new Set())
      router.push(`/admin/exams/${data.exam.id}/edit`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create exam')
    } finally {
      setQuickExamLoading(false)
    }
  }

  const handleView = async (questionId: string) => {
    setLoadingView(true)
    setViewDialogOpen(true)
    try {
      const response = await fetch(`/api/admin/questions/${questionId}`)
      if (!response.ok) throw new Error()
      const data = await response.json()
      setViewQuestion(data.question)
    } catch {
      toast.error('Failed to load question details')
      setViewDialogOpen(false)
    } finally {
      setLoadingView(false)
    }
  }

  const handleEdit = async (questionId: string) => {
    try {
      const response = await fetch(`/api/admin/questions/${questionId}`)
      if (!response.ok) throw new Error()
      const data = await response.json()
      setEditQuestionId(questionId)
      setEditQuestionData(data.question)
      setEditDialogOpen(true)
    } catch {
      toast.error('Failed to load question for editing')
    }
  }

  const handleDeleteClick = (questionId: string, statement: string) => {
    setDeleteQuestionId(questionId)
    setDeleteQuestionName(stripHtml(statement))
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteQuestionId) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/questions/${deleteQuestionId}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to delete question')
      toast.success('Question deleted successfully')
      setDeleteDialogOpen(false)
      fetchQuestions()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setDeleting(false)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const subjectOptions = subjects.map(s => ({ value: s.id, label: s.name }))
  const topicOptions = filteredTopics.map(t => ({ value: t.id, label: t.name }))
  const subTopicOptions = filteredSubTopics.map(st => ({ value: st.id, label: st.name }))

  return (
    <div className="space-y-6">
      {/* Header — untouched */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Question Bank</h1>
          <p className="text-gray-600 mt-1">{total} questions available</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm">
            <Select
              value={limit.toString()}
              onValueChange={val => { setLimit(Number(val)); setPage(1) }}
            >
              <SelectTrigger className="h-7 w-16 border-0 shadow-none text-xs font-medium focus:ring-0 px-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-gray-400 pr-1">per page</span>
            <div className="w-px h-4 bg-gray-200" />
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              title="Compact Table View"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'card' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              title="Expanded Card View"
            >
              <Rows3 className="w-4 h-4" />
            </button>
          </div>
          <Button variant="outline" onClick={() => window.location.href = '/admin/questions/import'}>
            <Upload className="w-4 h-4 mr-2" />Import
          </Button>
          <Button onClick={() => window.location.href = '/admin/questions/new'}>
            <Plus className="w-4 h-4 mr-2" />Add Question
          </Button>
        </div>
      </div>

      {/* Filters — untouched */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-7">
            <div className="lg:col-span-2 flex gap-2">
              <Input
                placeholder="Search questions..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} variant="outline">
                <Search className="w-4 h-4" />
              </Button>
            </div>
            <Select value={questionType} onValueChange={val => { setQuestionType(val); setPage(1) }}>
              <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="mcq">MCQ</SelectItem>
                <SelectItem value="numerical">Numerical</SelectItem>
                <SelectItem value="match">Match</SelectItem>
              </SelectContent>
            </Select>
            <SearchableSelect
              options={subjectOptions}
              value={subjectId}
              onValueChange={val => { setSubjectId(val); setPage(1) }}
              allLabel="All Subjects"
              allValue="all"
            />
            <SearchableSelect
              options={topicOptions}
              value={topicId}
              onValueChange={val => { setTopicId(val); setPage(1) }}
              allLabel="All Topics"
              allValue="all"
              disabled={filteredTopics.length === 0}
            />
            <SearchableSelect
              options={subTopicOptions}
              value={subTopicId}
              onValueChange={val => { setSubTopicId(val); setPage(1) }}
              allLabel="All SubTopics"
              allValue="all"
              disabled={filteredSubTopics.length === 0}
            />
            <Select value={difficulty} onValueChange={val => { setDifficulty(val); setPage(1) }}>
              <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t flex-wrap">
              <span className="text-xs text-muted-foreground">Active filters:</span>
              {search && <Badge variant="secondary" className="text-xs">Search: "{search}"</Badge>}
              {questionType !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Type: {questionType === 'mcq' ? 'MCQ' : questionType === 'numerical' ? 'Numerical' : 'Match'}
                </Badge>
              )}
              {subjectId !== 'all' && <Badge variant="secondary" className="text-xs">Subject: {subjects.find(s => s.id === subjectId)?.name}</Badge>}
              {topicId !== 'all' && <Badge variant="secondary" className="text-xs">Topic: {filteredTopics.find(t => t.id === topicId)?.name}</Badge>}
              {subTopicId !== 'all' && <Badge variant="secondary" className="text-xs">SubTopic: {filteredSubTopics.find(st => st.id === subTopicId)?.name}</Badge>}
              {difficulty !== 'all' && <Badge variant="secondary" className="text-xs">Difficulty: {difficulty}</Badge>}
              <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-xs h-6 ml-auto">Clear all filters</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sticky Bulk Action Bar — untouched */}
      {someSelected && (
        <div className="sticky top-4 z-20 flex flex-wrap items-center gap-3 bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-gray-700">{selectedIds.size} selected</span>
          <div className="h-4 w-px bg-gray-300 hidden sm:block" />
          <Button size="sm" onClick={() => setQuickExamDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <ClipboardList className="w-3.5 h-3.5 mr-1.5" />Create Exam
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportPdf}
            disabled={exportLoading}
            className="text-indigo-700 border-indigo-300 hover:bg-indigo-50"
          >
            {exportLoading
              ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />{exportStatus || 'Exporting…'}</>
              : <><FileDown className="w-3 h-3 mr-1" />Export PDF</>
            }
          </Button>
          <Button size="sm" variant="outline" disabled={bulkActionLoading} onClick={() => handleBulkToggle(true)} className="text-green-700 border-green-300 hover:bg-green-50">
            {bulkActionLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ToggleRight className="w-3 h-3 mr-1" />}Mark Active
          </Button>
          <Button size="sm" variant="outline" disabled={bulkActionLoading} onClick={() => handleBulkToggle(false)} className="text-gray-600 border-gray-300 hover:bg-gray-50">
            {bulkActionLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ToggleLeft className="w-3 h-3 mr-1" />}Mark Inactive
          </Button>
          <Button size="sm" variant="outline" disabled={bulkActionLoading} onClick={() => setBulkDeleteDialogOpen(true)} className="text-red-600 border-red-300 hover:bg-red-50">
            <Trash2 className="w-3 h-3 mr-1" />Delete
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto text-gray-400 hover:text-gray-600" onClick={() => setSelectedIds(new Set())}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Question Listing */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="h-12 w-12 text-gray-300 mb-2" />
            <p className="text-gray-600 font-medium">No questions found</p>
            <p className="text-sm text-gray-500 mt-1">
              {hasActiveFilters ? 'Try adjusting your filters' : 'Add your first question to get started!'}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={handleClearFilters} className="mt-4">Clear filters</Button>
            )}
          </CardContent>
        </Card>

      ) : viewMode === 'table' ? (
        // ── TABLE VIEW ────────────────────────────────────────────────────────
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input type="checkbox" className="rounded border-gray-300 cursor-pointer text-blue-600" checked={allSelected} onChange={handleSelectAll} />
                  </TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>SubTopic</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Status</TableHead>
                  {/* ✅ NEW column */}
                  <TableHead>Exams</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map(question => (
                  <TableRow key={question.id} className={selectedIds.has(question.id) ? 'bg-blue-50' : ''}>
                    <TableCell>
                      <input type="checkbox" className="rounded border-gray-300 cursor-pointer text-blue-600" checked={selectedIds.has(question.id)} onChange={() => handleSelectOne(question.id)} />
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="font-medium truncate text-sm" title={stripHtml(question.statement)}>
                        {stripHtml(question.statement) || '(Image/rich content question)'}
                      </p>
                    </TableCell>
                    <TableCell>{getTypeBadge(question.questionType)}</TableCell>
                    <TableCell>{question.subjectName}</TableCell>
                    <TableCell>{question.topicName}</TableCell>
                    <TableCell className="text-gray-500 text-sm">{question.subTopicName || <span className="text-gray-300">—</span>}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="text-green-600">+{question.marks}</div>
                        <div className="text-red-600">-{question.negativeMarks}</div>
                      </div>
                    </TableCell>
                    <TableCell><Badge className={getDifficultyColor(question.difficulty)}>{question.difficulty}</Badge></TableCell>
                    <TableCell>
                      <button onClick={() => handleInlineToggle(question)} disabled={togglingId === question.id} className="focus:outline-none">
                        {togglingId === question.id ? (
                          <Badge className="bg-gray-100 text-gray-500 cursor-wait"><Loader2 className="w-3 h-3 animate-spin mr-1" />...</Badge>
                        ) : (
                          <Badge className={`cursor-pointer transition-opacity hover:opacity-75 ${question.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {question.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        )}
                      </button>
                    </TableCell>
                    {/* ✅ NEW: exam usage cell in table view */}
                    <TableCell>
                      <UsedInExams exams={question.usedInExams ?? []} />
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{new Date(question.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleView(question.id)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(question.id)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(question.id, question.statement)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      ) : (
        // ── CARD VIEW ─────────────────────────────────────────────────────────
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={allSelected} onChange={handleSelectAll} className="rounded border-gray-300 w-4 h-4 text-blue-600 cursor-pointer" />
              <span className="text-sm font-medium text-gray-700">Select All ({questions.length})</span>
            </label>
          </div>
          {questions.map(q => (
            <div key={q.id} className={`relative flex gap-4 p-4 rounded-xl border bg-white shadow-sm transition-all ${selectedIds.has(q.id) ? 'border-blue-400 ring-1 ring-blue-400 bg-blue-50/30' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="pt-1">
                <input type="checkbox" checked={selectedIds.has(q.id)} onChange={() => handleSelectOne(q.id)} className="rounded border-gray-300 w-4 h-4 text-blue-600 cursor-pointer" />
              </div>
              <div className="flex-1 min-w-0">
                {/* Badges row — untouched */}
                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                  {getTypeBadge(q.questionType)}
                  <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{q.subjectName}</span>
                  <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{q.topicName}</span>
                  {q.subTopicName && <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{q.subTopicName}</span>}
                  <Badge className={getDifficultyColor(q.difficulty)}>{q.difficulty}</Badge>
                  <span className="text-xs font-medium px-2 py-0.5 rounded border border-gray-200"><span className="text-green-600">+{q.marks}</span> <span className="text-red-500">-{q.negativeMarks}</span></span>
                </div>

                {/* Statement — untouched */}
                <div className="text-sm text-gray-800 line-clamp-3 mb-3 prose prose-sm max-w-none leading-relaxed">
                  <SafeHtml html={q.statement} />
                </div>

                {/* ✅ NEW: exam usage — sits between statement and the metadata row */}
                <div className="mb-3">
                  <UsedInExams exams={q.usedInExams ?? []} />
                </div>

                {/* Metadata row — untouched */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Created: {new Date(q.createdAt).toLocaleDateString()}</span>
                  <div className="w-px h-3 bg-gray-300"></div>
                  <button onClick={() => handleInlineToggle(q)} disabled={togglingId === q.id} className="hover:opacity-80 transition-opacity">
                    {togglingId === q.id
                      ? <span className="flex items-center gap-1 text-gray-500"><Loader2 className="w-3 h-3 animate-spin" /> Updating...</span>
                      : q.isActive
                        ? <span className="flex items-center gap-1 text-green-600 font-medium"><CheckCircle2 className="w-3 h-3" /> Active</span>
                        : <span className="flex items-center gap-1 text-gray-500 font-medium"><X className="w-3 h-3" /> Inactive</span>
                    }
                  </button>
                </div>
              </div>

              {/* Action buttons — untouched */}
              <div className="flex flex-col gap-1 shrink-0 border-l border-gray-100 pl-3">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleView(q.id)}><Eye className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900" onClick={() => handleEdit(q.id)}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-red-600 hover:bg-red-50 mt-auto" onClick={() => handleDeleteClick(q.id, q.statement)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination — untouched */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
          <div className="flex items-center px-4">Page {page} of {totalPages}</div>
          <Button variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
        </div>
      )}

      {/* Quick Exam Dialog — untouched */}
      <Dialog open={quickExamDialogOpen} onOpenChange={setQuickExamDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Exam from Selected ({selectedIds.size} Questions)</DialogTitle>
            <DialogDescription>Instantly compile these questions into a new exam.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div>
              <Label className="text-sm font-medium">Exam Title *</Label>
              <Input value={quickExamData.title} onChange={(e) => setQuickExamData(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Physics Chapter Test 1" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Duration (min) *</Label>
                <Input type="number" value={quickExamData.durationMin} onChange={(e) => setQuickExamData(p => ({ ...p, durationMin: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Price (₹)</Label>
                <Input type="number" value={quickExamData.price / 100} onChange={(e) => { const price = parseFloat(e.target.value) * 100; setQuickExamData(p => ({ ...p, price, isFree: price === 0 })) }} className="mt-1" placeholder="0 for free" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Difficulty</Label>
                <Select value={quickExamData.difficulty} onValueChange={(v: any) => setQuickExamData(p => ({ ...p, difficulty: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Categories (Tags)</Label>
                <div className="mt-1">
                  <TagInput tags={quickExamData.tags} onChange={tags => setQuickExamData(p => ({ ...p, tags }))} existingTags={existingTags} />
                </div>
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={quickExamData.randomizeOrder} onChange={e => setQuickExamData(p => ({ ...p, randomizeOrder: e.target.checked }))} className="rounded border-gray-300 w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-700">Randomize question order</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={quickExamData.allowReview} onChange={e => setQuickExamData(p => ({ ...p, allowReview: e.target.checked }))} className="rounded border-gray-500 w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-700">Allow review before submit</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setQuickExamDialogOpen(false)} disabled={quickExamLoading}>Cancel</Button>
            <Button onClick={handleQuickCreateExam} disabled={quickExamLoading} className="bg-blue-600 hover:bg-blue-700">
              {quickExamLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ClipboardList className="w-4 h-4 mr-2" />}
              Create Exam
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog — untouched */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Question Details</DialogTitle>
            <DialogDescription>Complete information about this question</DialogDescription>
          </DialogHeader>
          {loadingView ? (
            <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : viewQuestion ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div><p className="text-sm text-gray-600">Subject</p><p className="font-medium">{viewQuestion.subject}</p></div>
                <div><p className="text-sm text-gray-600">Topic</p><p className="font-medium">{viewQuestion.topic}</p></div>
                {viewQuestion.subTopic && <div><p className="text-sm text-gray-600">SubTopic</p><p className="font-medium">{viewQuestion.subTopic}</p></div>}
                <div><p className="text-sm text-gray-600">Question Type</p><div className="mt-1">{getTypeBadge(viewQuestion.questionType)}</div></div>
                <div><p className="text-sm text-gray-600">Difficulty</p><Badge className={getDifficultyColor(viewQuestion.difficulty)}>{viewQuestion.difficulty}</Badge></div>
                <div><p className="text-sm text-gray-600">Marks</p><p className="font-medium"><span className="text-green-600">+{viewQuestion.marks}</span>{' / '}<span className="text-red-600">-{viewQuestion.negativeMarks}</span></p></div>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Question</Label>
                <div className="mt-2 text-base leading-relaxed"><SafeHtml html={viewQuestion.statement} /></div>
              </div>
              {(viewQuestion.questionType === 'mcq' || !viewQuestion.questionType) && (
                <div className="space-y-3">
                  <Label className="text-sm text-gray-600">Options</Label>
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                    const optionText = viewQuestion[`option${opt}` as keyof QuestionDetail] as string
                    const isCorrect = viewQuestion.correctAnswer === opt
                    return (
                      <div key={opt} className={`p-3 rounded-lg border-2 flex items-start gap-3 ${isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
                        <div className="flex items-center gap-2 mt-0.5 shrink-0">
                          <span className="font-bold text-sm">{opt}.</span>
                          {isCorrect && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                        </div>
                        <div className="flex-1 min-w-0"><SafeHtml html={optionText} /></div>
                      </div>
                    )
                  })}
                </div>
              )}
              {viewQuestion.questionType === 'numerical' && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Correct Answer</Label>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    {viewQuestion.correctAnswerExact !== null && viewQuestion.correctAnswerExact !== undefined ? (
                      <div><p className="text-xs text-blue-600 font-medium mb-1">Exact Value</p><p className="text-2xl font-bold text-blue-800">{viewQuestion.correctAnswerExact}</p></div>
                    ) : (
                      <div><p className="text-xs text-blue-600 font-medium mb-1">Accepted Range</p><p className="text-2xl font-bold text-blue-800">{viewQuestion.correctAnswerMin} &nbsp;to&nbsp; {viewQuestion.correctAnswerMax}</p></div>
                    )}
                  </div>
                </div>
              )}
              {viewQuestion.questionType === 'match' && viewQuestion.matchPairs && (
                <div className="space-y-3">
                  <Label className="text-sm text-gray-600">Match Columns</Label>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/60 border-b">
                          <th className="text-left px-4 py-2 font-medium w-1/2">{viewQuestion.matchPairs.leftColumn.header}</th>
                          <th className="text-left px-4 py-2 font-medium w-1/2">{viewQuestion.matchPairs.rightColumn.header}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewQuestion.matchPairs.leftColumn.items.map((item, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold shrink-0">
                                  {['A','B','C','D','E','F'][i]}
                                </span>
                                <SafeHtml html={item} />
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs font-semibold shrink-0">
                                  {['i','ii','iii','iv','v','vi'][i]}
                                </span>
                                <SafeHtml html={viewQuestion.matchPairs!.rightColumn.items[i]} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Label className="text-sm text-gray-600">Answer Combinations</Label>
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                    const optionText = viewQuestion[`option${opt}` as keyof QuestionDetail] as string
                    const isCorrect = viewQuestion.correctAnswer === opt
                    return (
                      <div key={opt} className={`p-3 rounded-lg border-2 flex items-center gap-3 ${isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
                        <span className="font-bold text-sm shrink-0">{opt}.</span>
                        {isCorrect && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />}
                        <span className="text-sm">{optionText}</span>
                      </div>
                    )
                  })}
                </div>
              )}
              {viewQuestion.explanation && (
                <div>
                  <Label className="text-sm text-gray-600">Explanation</Label>
                  <div className="mt-2 text-sm text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-200"><SafeHtml html={viewQuestion.explanation} /></div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-600">Status:</Label>
                <Badge className={viewQuestion.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>{viewQuestion.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
            </div>
          ) : <p>Failed to load question</p>}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog — untouched */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>Update question details below</DialogDescription>
          </DialogHeader>
          {editQuestionId && editQuestionData && (
            <QuestionForm
              questionId={editQuestionId}
              initialData={editQuestionData}
              mode="dialog"
              onSuccess={() => { setEditDialogOpen(false); fetchQuestions() }}
              onCancel={() => setEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Single Delete Dialog — untouched */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the question:
              <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                <p className="font-medium text-gray-900 line-clamp-2">{deleteQuestionName}</p>
              </div>
              <p className="mt-3 text-red-600">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</> : <><Trash2 className="w-4 h-4 mr-2" />Delete Question</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog — untouched */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} question{selectedIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete <strong>{selectedIds.size}</strong> selected question{selectedIds.size > 1 ? 's' : ''}.
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                Questions used in exams will be <strong>skipped</strong> automatically. The rest will be permanently deleted.
              </div>
              <p className="mt-3 text-red-600">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkActionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDeleteConfirm} disabled={bulkActionLoading} className="bg-red-600 hover:bg-red-700">
              {bulkActionLoading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
                : <><Trash2 className="w-4 h-4 mr-2" />Delete {selectedIds.size} Question{selectedIds.size > 1 ? 's' : ''}</>
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}