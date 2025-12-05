// src/app/(admin)/admin/exams/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Users,
  Clock,
  FileQuestion,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'

interface Exam {
  id: string
  title: string
  slug: string
  subject: string
  subjectSlug: string
  thumbnail: string | null
  duration: number
  totalQuestions: number
  totalMarks: number
  difficulty: 'easy' | 'medium' | 'hard'
  price: number
  isFree: boolean
  isPublished: boolean
  totalAttempts: number
}

interface Stats {
  total: number
  free: number
  paid: number
  published: number
  totalAttempts: number
}

export default function AdminExamsPage() {
  const router = useRouter()
  const [exams, setExams] = useState<Exam[]>([])
  const [stats, setStats] = useState<Stats>({
    total: 0,
    free: 0,
    paid: 0,
    published: 0,
    totalAttempts: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch exams
  useEffect(() => {
    fetchExams()
  }, [])

  const fetchExams = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/exams')
      if (!response.ok) throw new Error('Failed to fetch exams')
      
      const data = await response.json()
      setExams(data.exams || [])
      
      // Calculate stats
      const examsArray = data.exams || []
      setStats({
        total: examsArray.length,
        free: examsArray.filter((e: Exam) => e.isFree).length,
        paid: examsArray.filter((e: Exam) => !e.isFree).length,
        published: examsArray.filter((e: Exam) => e.isPublished).length,
        totalAttempts: examsArray.reduce((sum: number, e: Exam) => sum + e.totalAttempts, 0),
      })
    } catch (error) {
      console.error('Failed to fetch exams:', error)
      toast.error('Failed to load exams')
    } finally {
      setLoading(false)
    }
  }

  // Filter exams
  const filteredExams = exams.filter((exam) => {
    const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSubject = subjectFilter === 'all' || exam.subjectSlug === subjectFilter
    const matchesDifficulty = difficultyFilter === 'all' || exam.difficulty === difficultyFilter
    return matchesSearch && matchesSubject && matchesDifficulty
  })

  // Get unique subjects
  const subjects = Array.from(new Set(exams.map(e => ({ slug: e.subjectSlug, name: e.subject }))))

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-700'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700'
      case 'hard':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const handleCreateExam = () => {
    router.push('/admin/exams/new')
  }

  const handleEditExam = (examId: string) => {
    router.push(`/admin/exams/${examId}/edit`)
  }

  const handleViewExam = (examId: string) => {
    router.push(`/admin/exams/${examId}`)
  }

  const confirmDelete = (exam: Exam) => {
    setExamToDelete(exam)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!examToDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/exams/${examToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete exam')
      }

      toast.success('Exam deleted successfully')
      setDeleteDialogOpen(false)
      setExamToDelete(null)
      await fetchExams()
    } catch (error: any) {
      console.error('Failed to delete exam:', error)
      toast.error(error.message || 'Failed to delete exam')
    } finally {
      setDeleting(false)
    }
  }

  const handleTogglePublish = async (exam: Exam) => {
    try {
      const response = await fetch(`/api/admin/exams/${exam.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !exam.isPublished }) // ADDED BODY
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to toggle publish status')
      }

      toast.success(exam.isPublished ? 'Exam unpublished' : 'Exam published')
      await fetchExams()
    } catch (error: any) {
      console.error('Failed to toggle publish:', error)
      toast.error(error.message || 'Failed to update exam')
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Exam Management</h1>
          <p className="mt-2 text-gray-600">
            Manage all exams and mock tests ({stats.total} total)
          </p>
        </div>
        <Button onClick={handleCreateExam}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Exam
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search exams by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.slug} value={subject.slug}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Difficulties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Exams</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <FileQuestion className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Free Exams</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.free}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <FileQuestion className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Published</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.published}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                <FileQuestion className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Attempts</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.totalAttempts.toLocaleString()}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Users className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exams Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredExams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileQuestion className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-600 text-lg font-medium">No exams found</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              {exams.length === 0 ? 'Create your first exam to get started' : 'Try adjusting your filters'}
            </p>
            {exams.length === 0 && (
              <Button onClick={handleCreateExam}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Exam
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam) => (
            <Card key={exam.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                {/* Exam Image */}
                <div className="relative h-40 bg-gradient-to-br from-blue-500 to-blue-700">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileQuestion className="h-16 w-16 text-white opacity-50" />
                  </div>
                  <div className="absolute top-3 left-3">
                    <Badge className={getDifficultyColor(exam.difficulty)}>
                      {exam.difficulty}
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3">
                    <Badge variant={exam.isPublished ? 'default' : 'secondary'}>
                      {exam.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                </div>

                {/* Exam Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">
                    {exam.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">{exam.subject}</p>

                  <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{exam.duration}min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileQuestion className="h-4 w-4" />
                      <span>{exam.totalQuestions} Q</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{exam.totalAttempts}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    {exam.isFree ? (
                      <span className="text-lg font-bold text-green-600">Free</span>
                    ) : (
                      <span className="text-lg font-bold text-gray-900">
                        ₹{(exam.price / 100).toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewExam(exam.id)}  // Changed from exam.slug
                      className="flex-1"
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditExam(exam.id)}
                      className="flex-1"
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTogglePublish(exam)}
                    >
                      {exam.isPublished ? (
                        <ToggleRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => confirmDelete(exam)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>&quot;{examToDelete?.title}&quot;</strong>? 
              This action cannot be undone and will delete all related attempt data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}