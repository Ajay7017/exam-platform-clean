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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  ArrowLeft, Loader2, Plus, X, Filter, BookOpen, Layers, Tag,
  ChevronRight, Search, CheckSquare, Square, Eye, Edit3,
  CheckCircle2, Clock, FileText, Award, AlertCircle, BarChart3,
  GripVertical, Trash2, ChevronLeft, Check, Image as ImageIcon,
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

interface Subject { id: string; name: string; slug: string }
interface Topic { id: string; name: string; subjectId: string; subjectName: string; questionsCount: number }
interface SubTopic { id: string; name: string; topicId: string; topicName: string; subjectId: string; questionsCount: number }

interface Question {
  id: string; statement: string; topicId: string; topicName: string
  subjectId: string; subjectName: string; subTopicId?: string; subTopicName?: string
  difficulty: string; marks: number; negativeMarks: number; questionType?: string
}

interface QuestionDetail {
  id: string; statement: string; imageUrl?: string | null
  topicId: string; subTopicId?: string; subjectId: string
  difficulty: string; marks: number; negativeMarks: number
  optionA: string; optionB: string; optionC: string; optionD: string
  correctAnswer: 'A' | 'B' | 'C' | 'D'; explanation?: string
  topicName?: string; subTopicName?: string; subjectName?: string
  questionType?: string
  correctAnswerExact?: number | null
  correctAnswerMin?: number | null
  correctAnswerMax?: number | null
}

const difficultyColor: Record<string, string> = {
  easy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  hard: 'bg-red-50 text-red-700 border-red-200',
}

const STEPS = [
  { n: 1, label: 'Exam Details' },
  { n: 2, label: 'Select Questions' },
  { n: 3, label: 'Preview & Create' },
]

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

function SortableQuestionRow({
  question, index, onRemove,
}: {
  question: Question; index: number; onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: question.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-2 p-2.5 rounded-lg border bg-white text-xs group ${
        isDragging ? 'shadow-lg border-blue-300' : 'border-gray-100 hover:border-gray-200'
      }`}
    >
      <button
        type="button"
        className="mt-0.5 shrink-0 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-semibold text-xs mt-0.5">
        {index + 1}
      </span>
      <p
        className="flex-1 min-w-0 text-gray-700 line-clamp-2 leading-snug"
        dangerouslySetInnerHTML={{ __html: question.statement }}
      />
      <button
        type="button"
        onClick={() => onRemove(question.id)}
        className="shrink-0 text-gray-300 hover:text-red-500 transition-colors mt-0.5 opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function ExamPreview({
  formData, questions, totalMarks, onEdit, onSubmit, submitting,
}: {
  formData: any; questions: QuestionDetail[]; totalMarks: number
  onEdit: () => void; onSubmit: () => void; submitting: boolean
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
          <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{questions.length} questions</span>
            <span className="flex items-center gap-1"><Award className="h-3.5 w-3.5" />{totalMarks} marks</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formData.durationMin} min</span>
          </div>
          <label className="hidden md:flex items-center gap-2 cursor-pointer shrink-0">
            <div
              className={`relative w-9 h-5 rounded-full transition-colors ${showAnswers ? 'bg-green-500' : 'bg-gray-300'}`}
              onClick={() => setShowAnswers(v => !v)}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showAnswers ? 'translate-x-4' : ''}`} />
            </div>
            <span className="text-xs text-gray-600 font-medium">Show answers</span>
          </label>
          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={onEdit} disabled={submitting} className="text-xs">
              <Edit3 className="h-3.5 w-3.5 mr-1.5" />Edit Selection
            </Button>
            <Button type="button" size="sm" onClick={onSubmit} disabled={submitting} className="text-xs">
              {submitting ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Creating...</> : <><Plus className="h-3.5 w-3.5 mr-1.5" />Create Exam</>}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-6 pb-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h2 className="text-xl font-bold text-gray-900">{formData.title || 'Untitled Exam'}</h2>
                <Badge variant="outline" className={`capitalize text-xs ${difficultyColor[formData.difficulty]}`}>{formData.difficulty}</Badge>
                {formData.isFree
                  ? <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Free</Badge>
                  : <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">₹{(formData.price / 100).toFixed(0)}</Badge>
                }
              </div>
              {/* NEW: show tags in preview */}
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {formData.tags.map((tag: string) => (
                    <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-medium">
                      <Tag className="h-2.5 w-2.5" />{tag}
                    </span>
                  ))}
                </div>
              )}
              {formData.instructions && <p className="text-sm text-gray-500 mt-1 leading-relaxed">{formData.instructions}</p>}
            </div>
          </div>
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
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Difficulty Distribution</span>
            </div>
            <div className="flex gap-3 flex-wrap">
              {diffStats.easy > 0 && <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">{diffStats.easy} Easy</span>}
              {diffStats.medium > 0 && <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">{diffStats.medium} Medium</span>}
              {diffStats.hard > 0 && <span className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 font-medium">{diffStats.hard} Hard</span>}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-4 flex-wrap text-xs text-gray-500">
            <span className={formData.randomizeOrder ? 'text-blue-600' : ''}>{formData.randomizeOrder ? '✓' : '✗'} Randomized order</span>
            <span className={formData.allowReview ? 'text-blue-600' : ''}>{formData.allowReview ? '✓' : '✗'} Review before submit</span>
          </div>
        </div>

        <div className="space-y-4">
          {questions.map((question, index) => (
            <QuestionCard key={question.id} question={question} index={index} showAnswer={showAnswers} />
          ))}
        </div>

        <div className="sticky bottom-0 mt-6 -mx-6 px-6 py-4 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-900">{questions.length} questions</span>{' · '}
              <span className="font-semibold text-gray-900">{totalMarks} marks</span>{' · '}
              <span className="font-semibold text-gray-900">{formData.durationMin} min</span>
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onEdit} disabled={submitting}><Edit3 className="h-4 w-4 mr-2" />Edit Selection</Button>
              <Button onClick={onSubmit} disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : <><Plus className="h-4 w-4 mr-2" />Create Exam</>}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function QuestionCard({ question, index, showAnswer }: { question: QuestionDetail; index: number; showAnswer: boolean }) {
  const isNumerical = question.questionType === 'numerical'

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold mt-0.5">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap mb-2">
              {question.subjectName && (
                <><span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-medium">{question.subjectName}</span><ChevronRight className="h-3 w-3 text-gray-300" /></>
              )}
              {question.topicName && (
                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-1"><Layers className="h-2.5 w-2.5" />{question.topicName}</span>
              )}
              {question.subTopicName && (
                <><ChevronRight className="h-3 w-3 text-gray-300" /><span className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 flex items-center gap-1"><Tag className="h-2.5 w-2.5" />{question.subTopicName}</span></>
              )}
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${difficultyColor[question.difficulty] || ''}`}>{question.difficulty}</span>
            </div>
            <p className="text-sm text-gray-900 leading-relaxed font-medium [&_p]:inline [&_*]:inline" dangerouslySetInnerHTML={{ __html: question.statement }} />
          </div>
        </div>
      </div>

      {!isNumerical && (
        <div className="px-5 pb-4 space-y-2">
          {(['A', 'B', 'C', 'D'] as const).map(key => {
            const text = question[`option${key}` as keyof QuestionDetail] as string
            const isCorrect = key === question.correctAnswer
            const highlight = showAnswer && isCorrect
            return (
              <div key={key} className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors ${highlight ? 'bg-emerald-50 border-emerald-300' : 'bg-gray-50 border-gray-100'}`}>
                <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${highlight ? 'bg-emerald-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{key}</div>
                <p className={`text-sm flex-1 [&_p]:inline [&_*]:inline ${highlight ? 'text-emerald-800 font-medium' : 'text-gray-700'}`} dangerouslySetInnerHTML={{ __html: text }} />
                {highlight && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />}
              </div>
            )
          })}
        </div>
      )}

      {isNumerical && (
        <div className="px-5 pb-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            {question.correctAnswerExact !== null && question.correctAnswerExact !== undefined ? (
              <div><p className="text-xs text-blue-600 font-medium mb-1">Exact Value</p><p className="text-2xl font-bold text-blue-800">{question.correctAnswerExact}</p></div>
            ) : (
              <div><p className="text-xs text-blue-600 font-medium mb-1">Accepted Range</p><p className="text-2xl font-bold text-blue-800">{question.correctAnswerMin} to {question.correctAnswerMax}</p></div>
            )}
          </div>
        </div>
      )}

      <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/60 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-emerald-600 font-semibold">+{question.marks} marks</span>
          {question.negativeMarks > 0 && <span className="text-red-500 font-semibold">-{question.negativeMarks} negative</span>}
        </div>
        {question.explanation && showAnswer && (
          <div className="w-full mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1"><BookOpen className="h-3 w-3" />Explanation</p>
            <p className="text-xs text-blue-800 leading-relaxed [&_p]:inline [&_*]:inline" dangerouslySetInnerHTML={{ __html: question.explanation }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// TAG INPUT COMPONENT (NEW)
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
      {/* Tag pills + input box */}
      <div
        className="min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 flex flex-wrap gap-1.5 cursor-text"
        onClick={() => document.getElementById('tag-input')?.focus()}
      >
        {tags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); removeTag(tag) }}
              className="hover:text-red-500 transition-colors ml-0.5"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          id="tag-input"
          type="text"
          value={inputValue}
          onChange={e => { setInputValue(e.target.value); setShowSuggestions(true) }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={tags.length === 0 ? 'Type a category and press Enter (e.g. NEET, JEE, Class 11)' : ''}
          className="flex-1 min-w-[140px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (inputValue || suggestions.length > 0) && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
          {/* Existing tag suggestions */}
          {suggestions.map(tag => (
            <button
              key={tag}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              onMouseDown={() => addTag(tag)}
            >
              <Tag className="h-3 w-3 text-gray-400" />
              {tag}
              <span className="ml-auto text-xs text-gray-400">existing</span>
            </button>
          ))}
          {/* Option to create new tag */}
          {inputValue.trim() && !tags.includes(inputValue.trim()) && !existingTags.includes(inputValue.trim()) && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-blue-700 flex items-center gap-2 border-t border-gray-100"
              onMouseDown={() => addTag(inputValue)}
            >
              <Plus className="h-3 w-3" />
              Create &quot;{inputValue.trim()}&quot;
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export default function CreateExamPage() {
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [previewQuestions, setPreviewQuestions] = useState<QuestionDetail[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [allTopics, setAllTopics] = useState<Topic[]>([])
  const [allSubTopics, setAllSubTopics] = useState<SubTopic[]>([])
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // NEW: existing tags fetched from DB (for autocomplete)
  const [existingTags, setExistingTags] = useState<string[]>([])

  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [loadingSubTopics, setLoadingSubTopics] = useState(false)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: '', slug: '', isMultiSubject: false, subjectId: '',
    selectedSubjects: [] as string[], durationMin: 60, price: 0,
    isFree: true, instructions: '', randomizeOrder: false,
    allowReview: true, difficulty: 'medium' as 'easy' | 'medium' | 'hard', thumbnail: '',
    tags: [] as string[],   // NEW
  })

  const [filterSubject, setFilterSubject] = useState('all')
  const [filterTopic, setFilterTopic] = useState('all')
  const [filterSubTopic, setFilterSubTopic] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [filterQuestionType, setFilterQuestionType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const [thumbnailUploading, setThumbnailUploading] = useState(false)

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setThumbnailUploading(true)
    try {
      const fd = new FormData()
      fd.append('images', file)
      const res = await fetch('/api/admin/images/upload', { method: 'POST', body: fd })
      const data = await res.json()
      const result = data.uploaded?.[0]
      if (!result?.success) throw new Error(result?.error || 'Upload failed')
      setFormData(p => ({ ...p, thumbnail: result.url }))
      toast.success('Thumbnail uploaded')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload thumbnail')
    } finally {
      setThumbnailUploading(false)
    }
  }

  // Fetch subjects
  useEffect(() => {
    const fetch_ = async () => {
      setLoadingSubjects(true)
      try {
        const res = await fetch('/api/admin/subjects')
        if (!res.ok) throw new Error()
        setSubjects(await res.json())
      } catch { toast.error('Failed to load subjects') }
      finally { setLoadingSubjects(false) }
    }
    fetch_()
  }, [])

  // NEW: Fetch existing tags for autocomplete
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch('/api/admin/exams?limit=1')
        if (!res.ok) return
        const data = await res.json()
        if (data.allTags) setExistingTags(data.allTags)
      } catch { /* silently fail — tags are just a convenience */ }
    }
    fetchTags()
  }, [])

  // Fetch topics + questions when subject changes
  useEffect(() => {
    const subjectIds = formData.isMultiSubject
      ? formData.selectedSubjects
      : formData.subjectId ? [formData.subjectId] : []

    if (subjectIds.length === 0) {
      setAllTopics([]); setAllSubTopics([]); setAllQuestions([]); setSelectedIds([]); resetFilters()
      return
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
  }, [formData.isMultiSubject, formData.subjectId, formData.selectedSubjects])

  // Fetch subtopics when topic filter changes
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

  const canProceedStep1 = formData.title.trim() &&
    ((!formData.isMultiSubject && !!formData.subjectId) ||
     (formData.isMultiSubject && formData.selectedSubjects.length > 0))

  const canProceedStep2 = selectedIds.length >= 2

  const openPreview = useCallback(async () => {
    if (!canProceedStep2) { toast.error('Select at least 2 questions'); return }
    setLoadingPreview(true)
    try {
      const results = await Promise.all(selectedIds.map(id => fetch(`/api/admin/questions/${id}`).then(r => r.json())))
      const details: QuestionDetail[] = results.map((res, i) => {
        const q = res.question
        const meta = allQuestions.find(aq => aq.id === selectedIds[i])
        return { ...q, topicName: meta?.topicName || '', subTopicName: meta?.subTopicName || '', subjectName: meta?.subjectName || '' }
      })
      setPreviewQuestions(details)
      setStep(3)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch { toast.error('Failed to load preview') }
    finally { setLoadingPreview(false) }
  }, [selectedIds, allQuestions, canProceedStep2])

  const handleSubmit = async () => {
    if (selectedIds.length < 2) { toast.error('Select at least 2 questions'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/exams', {
        method: 'POST',
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
          tags: formData.tags,    // NEW
          ...(formData.thumbnail && { thumbnail: formData.thumbnail }),
        }),
      })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { throw new Error(`Server error: ${text.substring(0, 100)}`) }
      if (!res.ok) throw new Error(data.error || 'Failed to create exam')
      toast.success('Exam created successfully!')
      router.push('/admin/exams')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create exam')
    } finally { setSubmitting(false) }
  }

  if (step === 3) {
    return (
      <ExamPreview
        formData={formData}
        questions={previewQuestions}
        totalMarks={totalSelectedMarks}
        onEdit={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    )
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Exam Details</h1>
            <p className="text-gray-500 text-sm mt-1">Set up the basic information for your exam</p>
          </div>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="pt-6 space-y-5">

              <div>
                <Label htmlFor="title" className="text-sm font-medium">Exam Title *</Label>
                <Input id="title" value={formData.title} onChange={e => handleTitleChange(e.target.value)} placeholder="e.g., JEE Main Mock Test 1" className="mt-1" />
              </div>

              <div>
                <Label htmlFor="slug" className="text-sm font-medium">Slug *</Label>
                <Input id="slug" value={formData.slug} onChange={e => setFormData(p => ({ ...p, slug: e.target.value }))} placeholder="auto-generated" className="mt-1" />
                <p className="text-xs text-gray-400 mt-1">Auto-generated from title</p>
              </div>

              {/* Multi-Subject */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Switch id="multiSubject" checked={formData.isMultiSubject} onCheckedChange={handleMultiSubjectToggle} />
                <div>
                  <Label htmlFor="multiSubject" className="text-sm font-medium cursor-pointer">Multi-Subject Exam</Label>
                  <p className="text-xs text-gray-500 mt-0.5">Enable to select questions from multiple subjects</p>
                </div>
              </div>

              {/* Subject */}
              {!formData.isMultiSubject ? (
                <div>
                  <Label className="text-sm font-medium">Subject *</Label>
                  <Select value={formData.subjectId} onValueChange={v => setFormData(p => ({ ...p, subjectId: v }))} disabled={loadingSubjects}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={loadingSubjects ? 'Loading...' : 'Select subject'} /></SelectTrigger>
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
                            <button type="button" onClick={() => removeSubject(id)} className="rounded-full hover:bg-gray-300 p-0.5">
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                  <Select onValueChange={toggleSubject} disabled={loadingSubjects}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Add subjects..." /></SelectTrigger>
                    <SelectContent>
                      {subjects.filter(s => !formData.selectedSubjects.includes(s.id)).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Duration + Difficulty */}
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

              {/* Price */}
              <div>
                <Label htmlFor="price" className="text-sm font-medium">Price (₹)</Label>
                <Input id="price" type="number" min="0" value={formData.price / 100} onChange={e => handlePriceChange(parseFloat(e.target.value) * 100)} className="mt-1" />
                <p className="text-xs text-gray-400 mt-1">Set to 0 for free exam</p>
              </div>

              {/* ── NEW: CATEGORIES / TAGS ── */}
              <div>
                <Label className="text-sm font-medium">
                  Categories
                  <span className="ml-1.5 text-xs font-normal text-gray-400">(optional)</span>
                </Label>
                <p className="text-xs text-gray-400 mt-0.5 mb-2">
                  Tag this exam with categories like NEET, JEE, Class 11, School etc. Students can filter by these.
                </p>
                <TagInput
                  tags={formData.tags}
                  onChange={tags => setFormData(p => ({ ...p, tags }))}
                  existingTags={existingTags}
                />
              </div>

              {/* Instructions */}
              <div>
                <Label htmlFor="instructions" className="text-sm font-medium">Instructions</Label>
                <Textarea id="instructions" value={formData.instructions} onChange={e => setFormData(p => ({ ...p, instructions: e.target.value }))} placeholder="Enter exam instructions..." rows={3} className="mt-1" />
              </div>

              {/* Thumbnail */}
              <div>
                <Label className="text-sm font-medium">Exam Thumbnail</Label>
                <p className="text-xs text-gray-400 mt-0.5 mb-2">
                  Optional — shown on exam cards. If not set, a colored placeholder is used.
                </p>

                {formData.thumbnail ? (
                  <div className="relative w-full h-40 rounded-lg overflow-hidden border border-gray-200 group">
                    <img
                      src={formData.thumbnail}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, thumbnail: '' }))}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    thumbnailUploading
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      className="hidden"
                      disabled={thumbnailUploading}
                      onChange={handleThumbnailUpload}
                    />
                    {thumbnailUploading ? (
                      <div className="flex flex-col items-center gap-2 text-blue-500">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="text-xs">Uploading...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-gray-400">
                        <ImageIcon className="h-7 w-7" />
                        <span className="text-sm font-medium">Click to upload thumbnail</span>
                        <span className="text-xs">JPG, PNG, WEBP — max 10MB</span>
                      </div>
                    )}
                  </label>
                )}
              </div>

              {/* Settings */}
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

      {/* ══════════════ STEP 2: SELECT QUESTIONS (UNCHANGED) ══════════════ */}
      {step === 2 && (
        <div className="flex-1 px-6 pb-32 max-w-7xl mx-auto w-full">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Select Questions</h1>
            <p className="text-gray-500 text-sm mt-1">
              Browse and pick questions for <span className="font-semibold text-gray-700">{formData.title}</span>
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
                <p className="text-xs mt-1 opacity-70">Go back to Step 1 and select a subject first</p>
                <Button variant="outline" className="mt-4" onClick={() => setStep(1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" />Back to Details
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-[220px_1fr_280px] gap-4 items-start">

              {/* LEFT: Filters sidebar */}
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
                            {availableSubjectsInQuestions.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name} ({allQuestions.filter(q => q.subjectId === s.id).length})</SelectItem>
                            ))}
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

              {/* CENTER: Question list */}
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search questions..."
                        className="w-full h-8 pl-8 pr-8 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                      />
                      {searchQuery && (
                        <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <X className="h-3 w-3" />
                        </button>
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
                          <div
                            key={question.id}
                            className={`p-3 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 hover:bg-blue-100/80' : 'bg-white hover:bg-gray-50'}`}
                            onClick={() => toggleQuestion(question.id)}
                          >
                            <div className="flex items-start gap-2.5">
                              <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 cursor-pointer"
                                checked={isSelected}
                                onChange={() => toggleQuestion(question.id)}
                                onClick={e => e.stopPropagation()}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800 line-clamp-2 leading-snug" dangerouslySetInnerHTML={{ __html: question.statement }} />
                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                  {question.questionType === 'numerical'
                                    ? <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-medium"># Numerical</span>
                                    : <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100 font-medium">≡ MCQ</span>
                                  }
                                  {formData.isMultiSubject && (
                                    <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100 font-medium">{question.subjectName}</span>
                                  )}
                                  <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600"><Layers className="h-2.5 w-2.5" />{question.topicName}</span>
                                  {question.subTopicName && (
                                    <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100"><Tag className="h-2.5 w-2.5" />{question.subTopicName}</span>
                                  )}
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

              {/* RIGHT: Selected questions panel */}
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
                    {selectedIds.length > 0 && !formData.randomizeOrder && (
                      <p className="text-xs text-gray-400 mt-1">Drag to reorder</p>
                    )}
                    {selectedIds.length > 0 && formData.randomizeOrder && (
                      <p className="text-xs text-amber-500 mt-1">Order randomized for students</p>
                    )}
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {selectedIds.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                        <CheckSquare className="h-8 w-8 mb-2" />
                        <p className="text-xs text-center">No questions selected yet.<br />Click questions to add them.</p>
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

      {/* STICKY BOTTOM BAR (unchanged) */}
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
            {step === 1 && (
              <span className="text-gray-500 text-xs">Fill in exam details to proceed</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push('/admin/exams')} disabled={submitting || loadingPreview}>
              Cancel
            </Button>

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
              <>
                <Button
                  variant="outline"
                  onClick={openPreview}
                  disabled={!canProceedStep2 || loadingPreview}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  {loadingPreview ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</> : <><Eye className="mr-2 h-4 w-4" />Preview</>}
                </Button>
                <Button onClick={handleSubmit} disabled={!canProceedStep2 || submitting}>
                  {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : <><Plus className="mr-2 h-4 w-4" />Create Exam</>}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}