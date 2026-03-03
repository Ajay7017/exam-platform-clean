'use client'

import { useState, useEffect } from 'react'
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
  ToggleLeft, ToggleRight, X,
} from 'lucide-react'

function stripHtml(html: string) {
  return html
    .replace(/<math-node[^>]*><\/math-node>/g, '[Math]')
    .replace(/<[^>]*>/g, '')
    .trim()
}

function getTypeBadge(type?: 'mcq' | 'numerical') {
  if (type === 'numerical') {
    return <Badge className="bg-blue-100 text-blue-800 text-xs font-medium"># Numerical</Badge>
  }
  return <Badge className="bg-purple-100 text-purple-800 text-xs font-medium">≡ MCQ</Badge>
}

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
  questionType?: 'mcq' | 'numerical'
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
  questionType?: 'mcq' | 'numerical'
  correctAnswerExact?: number | null
  correctAnswerMin?: number | null
  correctAnswerMax?: number | null
}

export default function AdminQuestionsPage() {
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

  // ✅ NEW: bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  // ✅ NEW: inline toggle loading per question
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewQuestion, setViewQuestion] = useState<QuestionDetail | null>(null)
  const [loadingView, setLoadingView] = useState(false)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editQuestionId, setEditQuestionId] = useState<string | null>(null)
  const [editQuestionData, setEditQuestionData] = useState<Partial<QuestionDetail> | null>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null)
  const [deleteQuestionName, setDeleteQuestionName] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchSubjects()
    fetchTopics()
    fetchAllSubTopics()
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

  useEffect(() => {
    fetchQuestions()
  }, [page, difficulty, subjectId, topicId, subTopicId, questionType])

  // ✅ Clear selection when page/filters change
  useEffect(() => {
    setSelectedIds(new Set())
  }, [page, difficulty, subjectId, topicId, subTopicId, questionType])

  const fetchSubjects = async () => {
    try {
      const res = await fetch('/api/admin/subjects')
      if (!res.ok) return
      const data = await res.json()
      setSubjects(data.subjects || data || [])
    } catch (e) { console.error('Failed to fetch subjects', e) }
  }

  const fetchTopics = async () => {
    try {
      const res = await fetch('/api/admin/topics')
      if (!res.ok) return
      const data = await res.json()
      const list = data.topics || data || []
      setTopics(list)
      setFilteredTopics(list)
    } catch (e) { console.error('Failed to fetch topics', e) }
  }

  const fetchAllSubTopics = async () => {
    try {
      const res = await fetch('/api/admin/subtopics')
      if (!res.ok) return
      const data = await res.json()
      setSubTopics(data || [])
      setFilteredSubTopics(data || [])
    } catch (e) { console.error('Failed to fetch subtopics', e) }
  }

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: page.toString(), limit: '20' })
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

  // ✅ NEW: checkbox handlers
  const allCurrentIds = questions.map(q => q.id)
  const allSelected = allCurrentIds.length > 0 && allCurrentIds.every(id => selectedIds.has(id))
  const someSelected = selectedIds.size > 0

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allCurrentIds))
    }
  }

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  // ✅ NEW: inline status toggle
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

  // ✅ NEW: bulk toggle
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

  // ✅ NEW: bulk delete confirm
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Question Bank</h1>
          <p className="text-gray-600 mt-1">{total} questions available</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.href = '/admin/questions/import'}>
            <Upload className="w-4 h-4 mr-2" />Import Questions
          </Button>
          <Button onClick={() => window.location.href = '/admin/questions/new'}>
            <Plus className="w-4 h-4 mr-2" />Add Question
          </Button>
        </div>
      </div>

      {/* Filters */}
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
              </SelectContent>
            </Select>
            <Select value={subjectId} onValueChange={val => { setSubjectId(val); setPage(1) }}>
              <SelectTrigger><SelectValue placeholder="All Subjects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={topicId} onValueChange={val => { setTopicId(val); setPage(1) }} disabled={filteredTopics.length === 0}>
              <SelectTrigger><SelectValue placeholder="All Topics" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {filteredTopics.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={subTopicId} onValueChange={val => { setSubTopicId(val); setPage(1) }} disabled={filteredSubTopics.length === 0}>
              <SelectTrigger><SelectValue placeholder="All SubTopics" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All SubTopics</SelectItem>
                {filteredSubTopics.map(st => <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>)}
              </SelectContent>
            </Select>
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
              {questionType !== 'all' && <Badge variant="secondary" className="text-xs">Type: {questionType === 'mcq' ? 'MCQ' : 'Numerical'}</Badge>}
              {subjectId !== 'all' && <Badge variant="secondary" className="text-xs">Subject: {subjects.find(s => s.id === subjectId)?.name}</Badge>}
              {topicId !== 'all' && <Badge variant="secondary" className="text-xs">Topic: {filteredTopics.find(t => t.id === topicId)?.name}</Badge>}
              {subTopicId !== 'all' && <Badge variant="secondary" className="text-xs">SubTopic: {filteredSubTopics.find(st => st.id === subTopicId)?.name}</Badge>}
              {difficulty !== 'all' && <Badge variant="secondary" className="text-xs">Difficulty: {difficulty}</Badge>}
              <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-xs h-6 ml-auto">Clear all filters</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ NEW: Sticky Bulk Action Bar — only shows when items selected */}
      {someSelected && (
        <div className="sticky top-4 z-20 flex items-center gap-3 bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-gray-700">
            {selectedIds.size} selected
          </span>
          <div className="h-4 w-px bg-gray-300" />
          <Button
            size="sm"
            variant="outline"
            disabled={bulkActionLoading}
            onClick={() => handleBulkToggle(true)}
            className="text-green-700 border-green-300 hover:bg-green-50"
          >
            {bulkActionLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ToggleRight className="w-3 h-3 mr-1" />}
            Mark Active
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={bulkActionLoading}
            onClick={() => handleBulkToggle(false)}
            className="text-gray-600 border-gray-300 hover:bg-gray-50"
          >
            {bulkActionLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ToggleLeft className="w-3 h-3 mr-1" />}
            Mark Inactive
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={bulkActionLoading}
            onClick={() => setBulkDeleteDialogOpen(true)}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete Selected
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-gray-400 hover:text-gray-600"
            onClick={() => setSelectedIds(new Set())}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Questions Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      {/* ✅ NEW: wired select-all checkbox */}
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 cursor-pointer"
                        checked={allSelected}
                        onChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead>SubTopic</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="h-12 w-12 text-gray-300" />
                          <p className="text-gray-600">No questions found</p>
                          <p className="text-sm text-gray-500">
                            {hasActiveFilters ? 'Try adjusting your filters' : 'Add your first question to get started!'}
                          </p>
                          {hasActiveFilters && (
                            <Button variant="outline" size="sm" onClick={handleClearFilters}>Clear filters</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    questions.map(question => (
                      <TableRow
                        key={question.id}
                        className={selectedIds.has(question.id) ? 'bg-blue-50' : ''}
                      >
                        {/* ✅ NEW: wired individual checkbox */}
                        <TableCell>
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 cursor-pointer"
                            checked={selectedIds.has(question.id)}
                            onChange={() => handleSelectOne(question.id)}
                          />
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="font-medium truncate text-sm" title={stripHtml(question.statement)}>
                            {stripHtml(question.statement) || '(Image/rich content question)'}
                          </p>
                        </TableCell>
                        <TableCell>{getTypeBadge(question.questionType)}</TableCell>
                        <TableCell>{question.subjectName}</TableCell>
                        <TableCell>{question.topicName}</TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          {question.subTopicName || <span className="text-gray-300">—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="text-green-600">+{question.marks}</div>
                            <div className="text-red-600">-{question.negativeMarks}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getDifficultyColor(question.difficulty)}>
                            {question.difficulty}
                          </Badge>
                        </TableCell>

                        {/* ✅ NEW: Inline status toggle — click badge to toggle */}
                        <TableCell>
                          <button
                            onClick={() => handleInlineToggle(question)}
                            disabled={togglingId === question.id}
                            className="focus:outline-none"
                            title={`Click to mark as ${question.isActive ? 'Inactive' : 'Active'}`}
                          >
                            {togglingId === question.id ? (
                              <Badge className="bg-gray-100 text-gray-500 cursor-wait">
                                <Loader2 className="w-3 h-3 animate-spin mr-1" />...
                              </Badge>
                            ) : (
                              <Badge className={`cursor-pointer transition-opacity hover:opacity-75 ${
                                question.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {question.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            )}
                          </button>
                        </TableCell>

                        <TableCell className="text-sm text-gray-600">
                          {new Date(question.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleView(question.id)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(question.id)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(question.id, question.statement)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <div className="flex items-center px-4">Page {page} of {totalPages}</div>
              <Button variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
            </div>
          )}
        </>
      )}

      {/* VIEW DIALOG — untouched */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Question Details</DialogTitle>
            <DialogDescription>Complete information about this question</DialogDescription>
          </DialogHeader>
          {loadingView ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
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
              {(!viewQuestion.questionType || viewQuestion.questionType === 'mcq') && (
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

      {/* EDIT DIALOG — untouched */}
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

      {/* SINGLE DELETE DIALOG — untouched */}
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

      {/* ✅ NEW: BULK DELETE DIALOG */}
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
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              disabled={bulkActionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
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