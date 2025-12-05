// src/app/(admin)/admin/topics/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react'

interface Subject {
  id: string
  name: string
  slug: string
}

interface Topic {
  id: string
  name: string
  slug: string
  subjectId: string
  subjectName: string
  sequence: number
  isActive: boolean
  questionsCount: number
}

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSubject, setFilterSubject] = useState<string>('all')
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    subjectId: '',
    sequence: 0,
    isActive: true,
  })

  // Fetch subjects
  useEffect(() => {
    fetchSubjects()
  }, [])

  // Fetch topics
  useEffect(() => {
    fetchTopics()
  }, [filterSubject])

  const fetchSubjects = async () => {
    try {
      const res = await fetch('/api/admin/subjects')
      if (!res.ok) throw new Error('Failed to fetch subjects')
      const data = await res.json()
      setSubjects(data)
    } catch (error) {
      console.error('Failed to fetch subjects:', error)
      toast.error('Failed to load subjects')
    }
  }

  const fetchTopics = async () => {
    try {
      setLoading(true)
      let url = '/api/admin/topics'
      if (filterSubject !== 'all') {
        url += `?subjectId=${filterSubject}`
      }
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch topics')
      const data = await res.json()
      setTopics(data)
    } catch (error) {
      console.error('Failed to fetch topics:', error)
      toast.error('Failed to load topics')
    } finally {
      setLoading(false)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name),
    })
  }

  const handleCreate = () => {
    setEditingTopic(null)
    setFormData({
      name: '',
      slug: '',
      subjectId: '',
      sequence: 0,
      isActive: true,
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (topic: Topic) => {
    setEditingTopic(topic)
    setFormData({
      name: topic.name,
      slug: topic.slug,
      subjectId: topic.subjectId,
      sequence: topic.sequence,
      isActive: topic.isActive,
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const method = editingTopic ? 'PUT' : 'POST'
      const url = editingTopic
        ? `/api/admin/topics/${editingTopic.id}`
        : '/api/admin/topics'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save topic')
      }

      toast.success(
        editingTopic ? 'Topic updated successfully' : 'Topic created successfully'
      )

      setIsDialogOpen(false)
      resetForm()
      await fetchTopics()
    } catch (error: any) {
      console.error('Failed to save topic:', error)
      toast.error(error.message || 'Failed to save topic')
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDelete = (topic: Topic) => {
    if (topic.questionsCount > 0) {
      toast.error(
        `Cannot delete topic with ${topic.questionsCount} questions`
      )
      return
    }
    setTopicToDelete(topic)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!topicToDelete) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/topics/${topicToDelete.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete topic')
      }

      toast.success('Topic deleted successfully')
      setDeleteDialogOpen(false)
      setTopicToDelete(null)
      await fetchTopics()
    } catch (error: any) {
      console.error('Failed to delete topic:', error)
      toast.error(error.message || 'Failed to delete topic')
    } finally {
      setDeleting(false)
    }
  }

  const resetForm = () => {
    setEditingTopic(null)
    setFormData({
      name: '',
      slug: '',
      subjectId: '',
      sequence: 0,
      isActive: true,
    })
  }

  const filteredTopics = topics.filter((topic) =>
    topic.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Topics</h1>
          <p className="text-gray-600 mt-1">Manage exam topics</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Topic
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTopics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No topics found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTopics.map((topic) => (
                  <TableRow key={topic.id}>
                    <TableCell className="font-medium">{topic.name}</TableCell>
                    <TableCell className="text-gray-600">{topic.subjectName}</TableCell>
                    <TableCell className="text-sm text-gray-500">{topic.slug}</TableCell>
                    <TableCell>{topic.questionsCount}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          topic.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {topic.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(topic)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmDelete(topic)}
                          disabled={topic.questionsCount > 0}
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
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTopic ? 'Edit Topic' : 'Create Topic'}</DialogTitle>
            <DialogDescription>
              {editingTopic
                ? 'Update the topic details below'
                : 'Add a new topic to organize your questions'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Select
                  value={formData.subjectId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, subjectId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Topic Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Cell Biology"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g., cell-biology"
                  required
                />
                <p className="text-xs text-gray-500">
                  Auto-generated from name (lowercase, hyphenated)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sequence">Sequence</Label>
                <Input
                  id="sequence"
                  type="number"
                  value={formData.sequence}
                  onChange={(e) =>
                    setFormData({ ...formData, sequence: parseInt(e.target.value) || 0 })
                  }
                />
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
                  <>{editingTopic ? 'Update' : 'Create'}</>
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
            <AlertDialogTitle>Delete Topic?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>&quot;{topicToDelete?.name}&quot;</strong>? 
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
