// src/app/(admin)/admin/subjects/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react'

interface Subject {
  id: string
  name: string
  slug: string
  description?: string
  isActive: boolean
  topicsCount: number
  examsCount: number
  createdAt: string
}

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    isActive: true,
  })

  // Fetch subjects
  const fetchSubjects = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/subjects')
      if (!response.ok) throw new Error('Failed to fetch subjects')
      const data = await response.json()
      setSubjects(data)
    } catch (error) {
      console.error('Error fetching subjects:', error)
      toast.error('Failed to load subjects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubjects()
  }, [])

  // Auto-generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }))
  }

  // Open create dialog
  const handleCreate = () => {
    setEditingSubject(null)
    setFormData({
      name: '',
      slug: '',
      description: '',
      isActive: true,
    })
    setIsDialogOpen(true)
  }

  // Open edit dialog
  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject)
    setFormData({
      name: subject.name,
      slug: subject.slug,
      description: subject.description || '',
      isActive: subject.isActive,
    })
    setIsDialogOpen(true)
  }

  // Submit form (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const url = editingSubject
        ? `/api/admin/subjects/${editingSubject.id}`
        : '/api/admin/subjects'

      const method = editingSubject ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save subject')
      }

      const savedSubject = await response.json()

      toast.success(
        editingSubject
          ? 'Subject updated successfully'
          : 'Subject created successfully'
      )

      setIsDialogOpen(false)
      fetchSubjects() // Refresh list
    } catch (error: any) {
      console.error('Error saving subject:', error)
      toast.error(error.message || 'Failed to save subject')
    } finally {
      setSubmitting(false)
    }
  }

  // Confirm delete
  const confirmDelete = (subject: Subject) => {
    if (subject.topicsCount > 0 || subject.examsCount > 0) {
      toast.error(
        `Cannot delete subject with ${subject.topicsCount} topics and ${subject.examsCount} exams`
      )
      return
    }
    setSubjectToDelete(subject)
    setDeleteDialogOpen(true)
  }

  // Delete subject
  const handleDelete = async () => {
    if (!subjectToDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/subjects/${subjectToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete subject')
      }

      toast.success('Subject deleted successfully')
      setDeleteDialogOpen(false)
      setSubjectToDelete(null)
      fetchSubjects()
    } catch (error: any) {
      console.error('Error deleting subject:', error)
      toast.error(error.message || 'Failed to delete subject')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Subjects</h1>
          <p className="text-gray-600 mt-1">Manage exam subjects</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add Subject
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Topics</TableHead>
                <TableHead>Exams</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No subjects found. Create your first subject!
                  </TableCell>
                </TableRow>
              ) : (
                subjects.map(subject => (
                  <TableRow key={subject.id}>
                    <TableCell className="font-medium">{subject.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {subject.slug}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                      {subject.description || '-'}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{subject.topicsCount}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{subject.examsCount}</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          subject.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {subject.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(subject)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmDelete(subject)}
                          disabled={subject.topicsCount > 0 || subject.examsCount > 0}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSubject ? 'Edit Subject' : 'Create Subject'}
            </DialogTitle>
            <DialogDescription>
              {editingSubject
                ? 'Update the subject details below'
                : 'Add a new subject to your platform'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="e.g., Computer Science"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, slug: e.target.value }))
                  }
                  placeholder="e.g., computer-science"
                  required
                />
                <p className="text-xs text-gray-500">
                  Auto-generated from name (lowercase, hyphenated)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Brief description of the subject"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={checked =>
                    setFormData(prev => ({ ...prev, isActive: checked }))
                  }
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>{editingSubject ? 'Update' : 'Create'}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>&quot;{subjectToDelete?.name}&quot;</strong>? 
              This action cannot be undone.
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
