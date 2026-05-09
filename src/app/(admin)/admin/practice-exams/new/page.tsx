// src/app/(admin)/admin/practice-exams/new/page.tsx
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  ArrowLeft, Loader2, Search, X, CheckSquare, Square,
  BookOpen, Layers, Tag, ChevronRight,
} from 'lucide-react'

interface Subject { id: string; name: string; slug: string }
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
}

const difficultyColor: Record<string, string> = {
  easy:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  hard:   'bg-red-50 text-red-700 border-red-200',
}

export default function CreatePracticeExamPage() {
  const router = useRouter()

  // Form state
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [subjectId, setSubjectId]     = useState('')
  const [submitting, setSubmitting]   = useState(false)

  // Data
  const [subjects, setSubjects]         = useState<Subject[]>([])
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [selectedIds, setSelectedIds]   = useState<string[]>([])

  // Loading states
  const [loadingSubjects, setLoadingSubjects]   = useState(false)
  const [loadingQuestions, setLoadingQuestions] = useState(false)

  // Filters
  const [filterTopic, setFilterTopic]         = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [searchQuery, setSearchQuery]           = useState('')

  // Fetch subjects on mount
  useEffect(() => {
    const load = async () => {
      setLoadingSubjects(true)
      try {
        const res = await fetch('/api/admin/subjects')
        if (!res.ok) throw new Error()
        setSubjects(await res.json())
      } catch {
        toast.error('Failed to load subjects')
      } finally {
        setLoadingSubjects(false)
      }
    }
    load()
  }, [])

  // Fetch questions when subject changes
  useEffect(() => {
    if (!subjectId) { setAllQuestions([]); setSelectedIds([]); return }
    const load = async () => {
      setLoadingQuestions(true)
      try {
        const res = await fetch(`/api/admin/questions?subjectId=${subjectId}&limit=1000`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        setAllQuestions(data.questions || [])
        setSelectedIds([])
        setFilterTopic('all')
        setFilterDifficulty('all')
        setSearchQuery('')
      } catch {
        toast.error('Failed to load questions')
      } finally {
        setLoadingQuestions(false)
      }
    }
    load()
  }, [subjectId])

  // Topics derived from loaded questions
  const topics = useMemo(() => {
    const map = new Map<string, string>()
    allQuestions.forEach(q => map.set(q.topicId, q.topicName))
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [allQuestions])

  // Filtered questions
  const filteredQuestions = useMemo(() => allQuestions.filter(q => {
    if (filterTopic !== 'all' && q.topicId !== filterTopic) return false
    if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) return false
    if (searchQuery.trim() && !q.statement.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  }), [allQuestions, filterTopic, filterDifficulty, searchQuery])

  const areAllFilteredSelected = useMemo(() =>
    filteredQuestions.length > 0 && filteredQuestions.every(q => selectedIds.includes(q.id))
  , [filteredQuestions, selectedIds])

  const selectedQuestions = useMemo(() =>
    selectedIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean) as Question[]
  , [selectedIds, allQuestions])

  const toggleQuestion = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id])
  }, [])

  const selectAllFiltered = useCallback(() => {
    const ids = filteredQuestions.map(q => q.id)
    setSelectedIds(prev => {
      const allSel = ids.every(id => prev.includes(id))
      return allSel
        ? prev.filter(id => !ids.includes(id))
        : [...prev, ...ids.filter(id => !prev.includes(id))]
    })
  }, [filteredQuestions])

  const canSubmit = title.trim() && subjectId && selectedIds.length >= 1

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/practice-exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          subjectId,
          questionIds: selectedIds,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create')
      toast.success('Practice exam created successfully!')
      router.push('/admin/practice-exams')
    } catch (err: any) {
      toast.error(err.message || 'Failed to create practice exam')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/admin/practice-exams')}>
          <ArrowLeft className="mr-2 h-4 w-4" />Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Practice Exam</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Free scrollable quiz — students can check answers per question
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">

        {/* LEFT — Exam Details */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Exam Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              <div>
                <Label htmlFor="title" className="text-sm font-medium">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., Kinematics Practice Set 1"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium">
                  Description
                  <span className="ml-1 text-xs text-gray-400 font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description shown on the card..."
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">
                  Subject <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={subjectId}
                  onValueChange={setSubjectId}
                  disabled={loadingSubjects}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={
                      loadingSubjects ? 'Loading...' : 'Select subject'
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </CardContent>
          </Card>

          {/* Selected Questions Summary */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Selected Questions</CardTitle>
                <span className="text-sm font-semibold text-blue-600">
                  {selectedIds.length}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {selectedIds.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No questions selected yet
                </p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {selectedQuestions.map((q, i) => (
                    <div
                      key={q.id}
                      className="flex items-start gap-2 p-2 rounded-lg border border-gray-100 bg-gray-50 text-xs group"
                    >
                      <span className="shrink-0 w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-semibold text-xs mt-0.5">
                        {i + 1}
                      </span>
                      <p
                        className="flex-1 min-w-0 text-gray-700 line-clamp-2 leading-snug"
                        dangerouslySetInnerHTML={{ __html: q.statement }}
                      />
                      <button
                        type="button"
                        onClick={() => toggleQuestion(q.id)}
                        className="shrink-0 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            className="w-full"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
          >
            {submitting
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
              : 'Create Practice Exam'
            }
          </Button>
          <p className="text-xs text-gray-400 text-center">
            Exam will be created as Draft — publish it when ready
          </p>
        </div>

        {/* RIGHT — Question Picker */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Question Bank</CardTitle>
                {filteredQuestions.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllFiltered}
                    className="text-xs h-8"
                  >
                    {areAllFilteredSelected
                      ? <><CheckSquare className="h-3.5 w-3.5 mr-1" />Deselect All</>
                      : <><Square className="h-3.5 w-3.5 mr-1" />Select All</>
                    }
                  </Button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                {/* Search */}
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search questions..."
                    className="w-full h-8 pl-8 pr-8 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
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

                {/* Topic filter */}
                <Select
                  value={filterTopic}
                  onValueChange={setFilterTopic}
                  disabled={topics.length === 0}
                >
                  <SelectTrigger className="h-8 text-xs w-40">
                    <SelectValue placeholder="All Topics" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Topics</SelectItem>
                    {topics.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Difficulty filter */}
                <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                  <SelectTrigger className="h-8 text-xs w-36">
                    <SelectValue placeholder="All Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Difficulty</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs text-gray-500">
                Showing{' '}
                <strong className="text-gray-700">{filteredQuestions.length}</strong>
                {' '}of{' '}
                <strong className="text-gray-700">{allQuestions.length}</strong>
                {' '}questions
                {selectedIds.length > 0 && (
                  <span className="ml-2 text-blue-600 font-medium">
                    · {selectedIds.length} selected
                  </span>
                )}
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {!subjectId ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <BookOpen className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">Select a subject first</p>
                <p className="text-xs mt-1 opacity-70">
                  Questions will load based on subject
                </p>
              </div>
            ) : loadingQuestions ? (
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
              <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100">
                {filteredQuestions.map(question => {
                  const isSelected = selectedIds.includes(question.id)
                  return (
                    <div
                      key={question.id}
                      className={`p-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50 hover:bg-blue-100/80'
                          : 'bg-white hover:bg-gray-50'
                      }`}
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
                          <p
                            className="text-sm text-gray-800 line-clamp-2 leading-snug"
                            dangerouslySetInnerHTML={{ __html: question.statement }}
                          />
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded border font-medium capitalize ${difficultyColor[question.difficulty] || ''}`}>
                              {question.difficulty}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                              <Layers className="h-2.5 w-2.5" />{question.topicName}
                            </span>
                            {question.subTopicName && (
                              <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
                                <Tag className="h-2.5 w-2.5" />{question.subTopicName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}