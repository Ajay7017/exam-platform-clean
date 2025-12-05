// src/app/(admin)/admin/questions/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { QuestionForm } from '@/components/admin/QuestionForm'
import { toast } from 'sonner'
import { Loader2, Upload, Search, Eye, Edit, Trash2, Plus, CheckCircle2, XCircle } from 'lucide-react'

interface Question {
  id: string
  statement: string
  topicName: string
  subjectName: string
  marks: number
  negativeMarks: number
  difficulty: string
  isActive: boolean
  createdAt: string
}

interface QuestionDetail extends Question {
  topic: string
  subject: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: string
  explanation?: string
}

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState('all')

  // View Dialog State
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewQuestion, setViewQuestion] = useState<QuestionDetail | null>(null)
  const [loadingView, setLoadingView] = useState(false)

  // Edit Dialog State
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editQuestionId, setEditQuestionId] = useState<string | null>(null)
  const [editQuestionData, setEditQuestionData] = useState<Partial<QuestionDetail> | null>(null)

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null)
  const [deleteQuestionName, setDeleteQuestionName] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchQuestions()
  }, [page, difficulty])

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })

      if (difficulty !== 'all') {
        params.append('difficulty', difficulty)
      }

      if (search) {
        params.append('search', search)
      }

      const response = await fetch(`/api/admin/questions?${params}`)
      if (!response.ok) throw new Error('Failed to fetch questions')

      const data = await response.json()
      setQuestions(data.questions || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotal(data.pagination?.total || 0)
    } catch (error) {
      console.error('Error fetching questions:', error)
      toast.error('Failed to load questions')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchQuestions()
  }

  // VIEW: Load and display question details
  const handleView = async (questionId: string) => {
    setLoadingView(true)
    setViewDialogOpen(true)
    try {
      const response = await fetch(`/api/admin/questions/${questionId}`)
      if (!response.ok) throw new Error('Failed to fetch question')
      
      const data = await response.json()
      setViewQuestion(data.question)
    } catch (error) {
      toast.error('Failed to load question details')
      setViewDialogOpen(false)
    } finally {
      setLoadingView(false)
    }
  }

  // EDIT: Load question and open edit dialog
  const handleEdit = async (questionId: string) => {
    try {
      const response = await fetch(`/api/admin/questions/${questionId}`)
      if (!response.ok) throw new Error('Failed to fetch question')
      
      const data = await response.json()
      setEditQuestionId(questionId)
      setEditQuestionData(data.question)
      setEditDialogOpen(true)
    } catch (error) {
      toast.error('Failed to load question for editing')
    }
  }

  // DELETE: Confirm and delete question
  const handleDeleteClick = (questionId: string, questionStatement: string) => {
    setDeleteQuestionId(questionId)
    setDeleteQuestionName(questionStatement)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteQuestionId) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/questions/${deleteQuestionId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete question')
      }

      toast.success('Question deleted successfully')
      setDeleteDialogOpen(false)
      fetchQuestions() // Refresh list
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setDeleting(false)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'hard':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Question Bank</h1>
          <p className="text-gray-600 mt-1">
            {total} questions available
          </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.location.href = '/admin/questions/import'}>
              <Upload className="w-4 h-4 mr-2" />
              Import Questions
            </Button>
            <Button onClick={() => window.location.href = '/admin/questions/new'}>
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <div className="flex gap-2">
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
            </div>

            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>

            {(search || difficulty !== 'all') && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch('')
                  setDifficulty('all')
                  setPage(1)
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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
                      <input type="checkbox" className="rounded border-gray-300" />
                    </TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Topic</TableHead>
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
                      <TableCell colSpan={9} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="h-12 w-12 text-gray-300" />
                          <p className="text-gray-600">No questions found</p>
                          <p className="text-sm text-gray-500">
                            Add your first question to get started!
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    questions.map(question => (
                      <TableRow key={question.id}>
                        <TableCell>
                          <input type="checkbox" className="rounded border-gray-300" />
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="font-medium truncate" title={question.statement}>
                            {question.statement}
                          </p>
                        </TableCell>
                        <TableCell>{question.subjectName}</TableCell>
                        <TableCell>{question.topicName}</TableCell>
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
                        <TableCell>
                          <Badge
                            className={
                              question.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }
                          >
                            {question.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(question.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleView(question.id)}
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(question.id)}
                              title="Edit question"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(question.id, question.statement)}
                              title="Delete question"
                            >
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="flex items-center px-4">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* VIEW DIALOG */}
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
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Subject</p>
                  <p className="font-medium">{viewQuestion.subject}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Topic</p>
                  <p className="font-medium">{viewQuestion.topic}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Difficulty</p>
                  <Badge className={getDifficultyColor(viewQuestion.difficulty)}>
                    {viewQuestion.difficulty}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Marks</p>
                  <p className="font-medium">
                    <span className="text-green-600">+{viewQuestion.marks}</span>
                    {' / '}
                    <span className="text-red-600">-{viewQuestion.negativeMarks}</span>
                  </p>
                </div>
              </div>

              {/* Question Statement */}
              <div>
                <Label className="text-sm text-gray-600">Question</Label>
                <p className="mt-2 text-lg font-medium">{viewQuestion.statement}</p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <Label className="text-sm text-gray-600">Options</Label>
                {['A', 'B', 'C', 'D'].map((opt) => {
                  const optionText = viewQuestion[`option${opt}` as keyof QuestionDetail]
                  const isCorrect = viewQuestion.correctAnswer === opt
                  
                  return (
                    <div
                      key={opt}
                      className={`p-3 rounded-lg border-2 flex items-start gap-3 ${
                        isCorrect 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-bold text-sm">{opt}.</span>
                        {isCorrect && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                      </div>
                      <p className="flex-1">{optionText}</p>
                    </div>
                  )
                })}
              </div>

              {/* Explanation */}
              {viewQuestion.explanation && (
                <div>
                  <Label className="text-sm text-gray-600">Explanation</Label>
                  <p className="mt-2 text-sm text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    {viewQuestion.explanation}
                  </p>
                </div>
              )}

              {/* Status */}
              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-600">Status:</Label>
                <Badge className={viewQuestion.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {viewQuestion.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          ) : (
            <p>Failed to load question</p>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
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
              onSuccess={() => {
                setEditDialogOpen(false)
                fetchQuestions() // Refresh list
              }}
              onCancel={() => setEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the question:
              <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                <p className="font-medium text-gray-900 line-clamp-2">
                  {deleteQuestionName}
                </p>
              </div>
              <p className="mt-3 text-red-600">
                This action cannot be undone. The question will be removed from the database.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Question
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}