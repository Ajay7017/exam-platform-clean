// src/app/(admin)/admin/practice-exams/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import {
  Plus, Edit, Trash2, Globe, EyeOff, Loader2, FileQuestion, BookOpen,
} from 'lucide-react'

interface PracticeExam {
  id: string
  title: string
  slug: string
  description: string | null
  subject: { id: string; name: string; slug: string }
  questionCount: number
  status: 'DRAFT' | 'PUBLISHED'
  createdAt: string
}

export default function AdminPracticeExamsPage() {
  const router = useRouter()
  const [exams, setExams] = useState<PracticeExam[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [examToDelete, setExamToDelete] = useState<PracticeExam | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchExams() }, [])

  const fetchExams = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/practice-exams')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setExams(data.practiceExams || [])
    } catch {
      toast.error('Failed to load practice exams')
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePublish = async (exam: PracticeExam) => {
    setTogglingId(exam.id)
    try {
      const res = await fetch(`/api/admin/practice-exams/${exam.id}/publish`, {
        method: 'POST',
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      const data = await res.json()
      setExams(prev => prev.map(e =>
        e.id === exam.id ? { ...e, status: data.status } : e
      ))
      toast.success(data.message)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status')
    } finally {
      setTogglingId(null)
    }
  }

  const confirmDelete = (exam: PracticeExam) => {
    setExamToDelete(exam)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!examToDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/practice-exams/${examToDelete.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      toast.success('Practice exam deleted successfully')
      setDeleteDialogOpen(false)
      setExamToDelete(null)
      fetchExams()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  const published = exams.filter(e => e.status === 'PUBLISHED').length
  const draft = exams.filter(e => e.status === 'DRAFT').length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Practice Exams</h1>
          <p className="mt-1 text-gray-600">
            Free practice question sets for students — no login required
          </p>
        </div>
        <Button onClick={() => router.push('/admin/practice-exams/new')}>
          <Plus className="mr-2 h-4 w-4" />Create Practice Exam
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Total',     value: exams.length, color: 'bg-blue-100 text-blue-600' },
          { label: 'Published', value: published,     color: 'bg-green-100 text-green-600' },
          { label: 'Draft',     value: draft,         color: 'bg-gray-100 text-gray-600' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${color}`}>
                  <FileQuestion className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : exams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-600 text-lg font-medium">No practice exams yet</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Create your first practice exam to get started
            </p>
            <Button onClick={() => router.push('/admin/practice-exams/new')}>
              <Plus className="mr-2 h-4 w-4" />Create First Practice Exam
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map(exam => {
                  const toggling = togglingId === exam.id
                  return (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium max-w-[240px]">
                        <div>
                          <p className="truncate" title={exam.title}>{exam.title}</p>
                          {exam.description && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                              {exam.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{exam.subject.name}</Badge>
                      </TableCell>
                      <TableCell>{exam.questionCount} Q</TableCell>
                      <TableCell>
                        <Badge className={
                          exam.status === 'PUBLISHED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }>
                          {exam.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(exam.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => router.push(`/admin/practice-exams/${exam.id}/edit`)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            disabled={toggling}
                            onClick={() => handleTogglePublish(exam)}
                            title={exam.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                          >
                            {toggling
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : exam.status === 'PUBLISHED'
                                ? <EyeOff className="h-4 w-4 text-orange-500" />
                                : <Globe className="h-4 w-4 text-green-600" />
                            }
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => confirmDelete(exam)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Practice Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>&quot;{examToDelete?.title}&quot;</strong>?
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
                : 'Delete'
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}