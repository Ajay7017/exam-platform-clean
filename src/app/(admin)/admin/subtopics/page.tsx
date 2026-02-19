// src/app/(admin)/admin/subtopics/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search, Loader2, ChevronRight } from 'lucide-react'

interface Subject { id: string; name: string }
interface Topic { id: string; name: string; subjectId: string }
interface SubTopic {
  id: string; name: string; slug: string; topicId: string; topicName: string
  subjectId: string; sequence: number; isActive: boolean; questionsCount: number
}

const PAGE_SIZE = 10

export default function SubTopicsPage() {
  const [subTopics, setSubTopics] = useState<SubTopic[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [page, setPage] = useState(1)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSubject, setFilterSubject] = useState('all')
  const [filterTopic, setFilterTopic] = useState('all')

  // Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSubTopic, setEditingSubTopic] = useState<SubTopic | null>(null)

  // Delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [subTopicToDelete, setSubTopicToDelete] = useState<SubTopic | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Form
  const [formData, setFormData] = useState({
    name: '', slug: '', subjectId: '', topicId: '', sequence: 0, isActive: true,
  })
  const [formTopics, setFormTopics] = useState<Topic[]>([]) // topics for form dropdown

  useEffect(() => { fetchSubjects(); fetchAllTopics() }, [])
  useEffect(() => { fetchSubTopics() }, [filterTopic])

  // Filter topics in filter bar by selected subject
  useEffect(() => {
    if (filterSubject === 'all') {
      setFilteredTopics(topics)
    } else {
      setFilteredTopics(topics.filter(t => t.subjectId === filterSubject))
    }
    setFilterTopic('all')
  }, [filterSubject, topics])

  // Filter form topics when form subject changes
  useEffect(() => {
    if (formData.subjectId) {
      setFormTopics(topics.filter(t => t.subjectId === formData.subjectId))
      setFormData(f => ({ ...f, topicId: '' }))
    } else {
      setFormTopics([])
    }
  }, [formData.subjectId, topics])

  const fetchSubjects = async () => {
    try {
      const res = await fetch('/api/admin/subjects')
      if (!res.ok) throw new Error()
      setSubjects(await res.json())
    } catch { toast.error('Failed to load subjects') }
  }

  const fetchAllTopics = async () => {
    try {
      const res = await fetch('/api/admin/topics')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTopics(data)
      setFilteredTopics(data)
    } catch { toast.error('Failed to load topics') }
  }

  const fetchSubTopics = async () => {
    try {
      setLoading(true)
      const url = filterTopic !== 'all'
        ? `/api/admin/subtopics?topicId=${filterTopic}`
        : '/api/admin/subtopics'
      const res = await fetch(url)
      if (!res.ok) throw new Error()
      setSubTopics(await res.json())
      setPage(1)
    } catch { toast.error('Failed to load subtopics') }
    finally { setLoading(false) }
  }

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const handleCreate = () => {
    setEditingSubTopic(null)
    setFormData({ name: '', slug: '', subjectId: '', topicId: '', sequence: 0, isActive: true })
    setIsDialogOpen(true)
  }

  const handleEdit = (st: SubTopic) => {
    setEditingSubTopic(st)
    setFormData({ name: st.name, slug: st.slug, subjectId: st.subjectId, topicId: st.topicId, sequence: st.sequence, isActive: st.isActive })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.topicId) { toast.error('Please select a topic'); return }
    setSubmitting(true)
    try {
      const method = editingSubTopic ? 'PATCH' : 'POST'
      const url = editingSubTopic
        ? `/api/admin/subtopics/${editingSubTopic.id}`
        : '/api/admin/subtopics'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          topicId: formData.topicId,
          sequence: formData.sequence,
          isActive: formData.isActive,
        }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      toast.success(editingSubTopic ? 'SubTopic updated' : 'SubTopic created')
      setIsDialogOpen(false)
      setEditingSubTopic(null)
      await fetchSubTopics()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save subtopic')
    } finally { setSubmitting(false) }
  }

  const confirmDelete = (st: SubTopic) => {
    if (st.questionsCount > 0) {
      toast.error(`Cannot delete subtopic with ${st.questionsCount} questions`)
      return
    }
    setSubTopicToDelete(st)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!subTopicToDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/subtopics/${subTopicToDelete.id}`, { method: 'DELETE' })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      toast.success('SubTopic deleted')
      setDeleteDialogOpen(false)
      setSubTopicToDelete(null)
      await fetchSubTopics()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete subtopic')
    } finally { setDeleting(false) }
  }

  const filtered = subTopics.filter(st =>
    st.name.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <span>Subjects</span>
            <ChevronRight className="h-3 w-3" />
            <span>Topics</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-700 font-medium">SubTopics</span>
          </div>
          <h1 className="text-3xl font-bold">SubTopics</h1>
          <p className="text-gray-600 mt-1">Manage subtopics within each topic ({filtered.length} total)</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />Add SubTopic
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search subtopics..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
            className="pl-10"
          />
        </div>
        <Select value={filterSubject} onValueChange={v => { setFilterSubject(v); setPage(1) }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Subjects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTopic} onValueChange={v => { setFilterTopic(v); setPage(1) }} disabled={filteredTopics.length === 0}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Topics" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            {filteredTopics.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">No subtopics found</TableCell>
                  </TableRow>
                ) : (
                  paginated.map(st => (
                    <TableRow key={st.id}>
                      <TableCell className="font-medium">{st.name}</TableCell>
                      <TableCell className="text-gray-600">{st.topicName}</TableCell>
                      <TableCell className="text-sm text-gray-500">{st.slug}</TableCell>
                      <TableCell>{st.questionsCount}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          st.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {st.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(st)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => confirmDelete(st)} disabled={st.questionsCount > 0}>
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

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <div className="flex items-center px-4 text-sm">Page {page} of {totalPages}</div>
              <Button variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubTopic ? 'Edit SubTopic' : 'Create SubTopic'}</DialogTitle>
            <DialogDescription>
              {editingSubTopic ? 'Update subtopic details below' : 'Add a new subtopic under a topic'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Subject first */}
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Select
                  value={formData.subjectId}
                  onValueChange={v => setFormData(f => ({ ...f, subjectId: v, topicId: '' }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Then Topic */}
              <div className="space-y-2">
                <Label>Topic *</Label>
                <Select
                  value={formData.topicId}
                  onValueChange={v => setFormData(f => ({ ...f, topicId: v }))}
                  disabled={!formData.subjectId || formTopics.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!formData.subjectId ? 'Select subject first' : 'Select topic'} />
                  </SelectTrigger>
                  <SelectContent>
                    {formTopics.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>SubTopic Name *</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value, slug: generateSlug(e.target.value) }))}
                  placeholder="e.g., Boyle's Law"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input
                  value={formData.slug}
                  onChange={e => setFormData(f => ({ ...f, slug: e.target.value }))}
                  placeholder="e.g., boyles-law"
                  required
                />
                <p className="text-xs text-gray-500">Auto-generated from name</p>
              </div>
              <div className="space-y-2">
                <Label>Sequence</Label>
                <Input
                  type="number"
                  value={formData.sequence}
                  onChange={e => setFormData(f => ({ ...f, sequence: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : editingSubTopic ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SubTopic?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>&quot;{subTopicToDelete?.name}&quot;</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}