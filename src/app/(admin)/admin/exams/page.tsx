// src/app/(admin)/admin/exams/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import {
  Plus, Search, Edit, Trash2, Eye, Users, Clock, FileQuestion,
  Loader2, LayoutGrid, List, Gift, Radio, Globe, EyeOff, Tag,
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
  tags: string[]   // ← ADDED
}

interface Stats {
  total: number
  free: number
  paid: number
  published: number
  totalAttempts: number
}

// ── helpers ──────────────────────────────────────────────────────────────────

const SUBJECT_GRADIENTS = [
  'from-violet-500 to-purple-700',
  'from-blue-500 to-cyan-700',
  'from-emerald-500 to-teal-700',
  'from-orange-500 to-amber-700',
  'from-pink-500 to-rose-700',
  'from-indigo-500 to-blue-700',
  'from-teal-500 to-green-700',
  'from-red-500 to-orange-700',
]

function getSubjectGradient(subject: string) {
  let hash = 0
  for (let i = 0; i < subject.length; i++) hash = subject.charCodeAt(i) + ((hash << 5) - hash)
  return SUBJECT_GRADIENTS[Math.abs(hash) % SUBJECT_GRADIENTS.length]
}

function getSubjectInitial(subject: string) {
  return subject?.trim()?.[0]?.toUpperCase() || '?'
}

function getDifficultyColor(d: string) {
  switch (d) {
    case 'easy': return 'bg-green-100 text-green-700'
    case 'medium': return 'bg-yellow-100 text-yellow-700'
    case 'hard': return 'bg-red-100 text-red-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}
function getOptimizedThumbnail(url: string): string {
  if (!url || !url.includes('cloudinary.com')) return url
  return url.replace('/upload/', '/upload/c_fill,w_800,h_450,q_auto,f_auto/')
}

// ── component ─────────────────────────────────────────────────────────────────

export default function AdminExamsPage() {
  const router = useRouter()
  const [exams, setExams] = useState<Exam[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, free: 0, paid: 0, published: 0, totalAttempts: 0 })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [publishFilter, setPublishFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('all')          // ← ADDED
  const [allTags, setAllTags] = useState<string[]>([])       // ← ADDED

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('examViewMode') as 'grid' | 'list') || 'grid'
    }
    return 'grid'
  })

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchExams() }, [])

  useEffect(() => {
    localStorage.setItem('examViewMode', viewMode)
  }, [viewMode])

  const fetchExams = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/exams')
      if (!res.ok) throw new Error()
      const data = await res.json()
      const arr: Exam[] = data.exams || []
      setExams(arr)
      // ← ADDED: read allTags from the API response
      if (data.allTags) setAllTags(data.allTags)
      setStats({
        total: arr.length,
        free: arr.filter(e => e.isFree).length,
        paid: arr.filter(e => !e.isFree).length,
        published: arr.filter(e => e.isPublished).length,
        totalAttempts: arr.reduce((s, e) => s + e.totalAttempts, 0),
      })
    } catch {
      toast.error('Failed to load exams')
    } finally {
      setLoading(false)
    }
  }

  // ── filtering ─────────────────────────────────────────────────────────────
  const filteredExams = exams.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchSubject = subjectFilter === 'all' || e.subjectSlug === subjectFilter
    const matchDiff = difficultyFilter === 'all' || e.difficulty === difficultyFilter
    const matchPublish =
      publishFilter === 'all' ||
      (publishFilter === 'published' && e.isPublished) ||
      (publishFilter === 'draft' && !e.isPublished)
    // ← ADDED: tag filter
    const matchTag = tagFilter === 'all' || (e.tags && e.tags.includes(tagFilter))
    return matchSearch && matchSubject && matchDiff && matchPublish && matchTag
  })

  const subjects = Array.from(
    new Map(exams.map(e => [e.subjectSlug, e.subject])).entries()
  ).map(([slug, name]) => ({ slug, name }))

  // ── actions ───────────────────────────────────────────────────────────────
  const handleTogglePublish = async (exam: Exam) => {
    setTogglingId(exam.id)
    try {
      const res = await fetch(`/api/admin/exams/${exam.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !exam.isPublished }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      setExams(prev => prev.map(e => e.id === exam.id ? { ...e, isPublished: !e.isPublished } : e))
      setStats(prev => ({
        ...prev,
        published: exam.isPublished ? prev.published - 1 : prev.published + 1,
      }))
      toast.success(exam.isPublished ? 'Exam unpublished' : 'Exam published')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update exam')
    } finally {
      setTogglingId(null)
    }
  }

  const confirmDelete = (exam: Exam) => { setExamToDelete(exam); setDeleteDialogOpen(true) }

  const handleDelete = async () => {
    if (!examToDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/exams/${examToDelete.id}`, { method: 'DELETE' })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      toast.success('Exam deleted successfully')
      setDeleteDialogOpen(false)
      setExamToDelete(null)
      fetchExams()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete exam')
    } finally {
      setDeleting(false)
    }
  }

  // ── sub-components ────────────────────────────────────────────────────────

  function ExamCardHeader({ exam }: { exam: Exam }) {
    const gradient = getSubjectGradient(exam.subject)
    const initial = getSubjectInitial(exam.subject)

    if (exam.thumbnail) {
      return (
        // AFTER
        <div className="relative w-full rounded-t-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
          <img src={getOptimizedThumbnail(exam.thumbnail)} alt={exam.title} className="w-full h-full object-cover" />
          <div className="absolute top-3 left-3">
            <Badge className={getDifficultyColor(exam.difficulty)}>{exam.difficulty}</Badge>
          </div>
          <div className="absolute top-3 right-3">
            <Badge className={exam.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
              {exam.isPublished ? 'Published' : 'Draft'}
            </Badge>
          </div>
        </div>
      )
    }

    return (
      <div className={`relative w-full bg-gradient-to-br ${gradient} rounded-t-lg overflow-hidden`} style={{ aspectRatio: '16/9' }}>
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <span className="text-2xl font-bold text-white">{initial}</span>
          </div>
          <span className="text-white/80 text-xs font-medium tracking-wide uppercase">{exam.subject}</span>
        </div>
        <div className="absolute top-3 left-3">
          <Badge className={getDifficultyColor(exam.difficulty)}>{exam.difficulty}</Badge>
        </div>
        <div className="absolute top-3 right-3">
          <Badge className={exam.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
            {exam.isPublished ? 'Published' : 'Draft'}
          </Badge>
        </div>
      </div>
    )
  }

  function ExamCard({ exam }: { exam: Exam }) {
    const toggling = togglingId === exam.id
    return (
      <Card className="hover:shadow-lg transition-shadow overflow-hidden">
        <CardContent className="p-0">
          <ExamCardHeader exam={exam} />
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 truncate mb-1" title={exam.title}>
              {exam.title}
            </h3>
            <p className="text-sm text-gray-500 mb-2">{exam.subject}</p>

            {/* ← ADDED: tag pills on admin card */}
            {exam.tags && exam.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {exam.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-medium"
                  >
                    <Tag className="h-2.5 w-2.5" />{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /><span>{exam.duration}min</span>
              </div>
              <div className="flex items-center gap-1">
                <FileQuestion className="h-3.5 w-3.5" /><span>{exam.totalQuestions} Q</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /><span>{exam.totalAttempts}</span>
              </div>
            </div>

            <div className="mb-4">
              {exam.isFree
                ? <span className="text-base font-bold text-green-600">Free</span>
                : <span className="text-base font-bold text-gray-900">₹{(exam.price / 100).toFixed(2)}</span>
              }
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => router.push(`/admin/exams/${exam.id}`)}>
                <Eye className="h-3 w-3 mr-1" />View
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => router.push(`/admin/exams/${exam.id}/edit`)}>
                <Edit className="h-3 w-3 mr-1" />Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={toggling}
                onClick={() => handleTogglePublish(exam)}
                className={exam.isPublished ? 'text-orange-600 border-orange-300 hover:bg-orange-50' : 'text-green-600 border-green-300 hover:bg-green-50'}
              >
                {toggling
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : exam.isPublished
                    ? <><EyeOff className="h-3 w-3 mr-1" />Unpublish</>
                    : <><Globe className="h-3 w-3 mr-1" />Publish</>
                }
              </Button>
              <Button variant="outline" size="sm" onClick={() => confirmDelete(exam)}>
                <Trash2 className="h-3 w-3 text-red-600" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Exam Management</h1>
          <p className="mt-1 text-gray-600">Manage all exams and mock tests ({stats.total} total)</p>
        </div>
        <Button onClick={() => router.push('/admin/exams/new')}>
          <Plus className="mr-2 h-4 w-4" />Create New Exam
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total Exams', value: stats.total, icon: FileQuestion, color: 'bg-blue-100 text-blue-600' },
          { label: 'Free Exams', value: stats.free, icon: Gift, color: 'bg-green-100 text-green-600' },
          { label: 'Published', value: stats.published, icon: Radio, color: 'bg-yellow-100 text-yellow-600' },
          { label: 'Total Attempts', value: stats.totalAttempts.toLocaleString(), icon: Users, color: 'bg-red-100 text-red-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + View Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search exams by title..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Subject */}
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Subjects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(s => <SelectItem key={s.slug} value={s.slug}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Difficulty */}
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Difficulties" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>

            {/* Publish status */}
            <Select value={publishFilter} onValueChange={setPublishFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>

            {/* ← ADDED: Tag / Category filter — only shows when tags exist */}
            {allTags.length > 0 && (
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag}>
                      <span className="flex items-center gap-1.5">
                        <Tag className="h-3 w-3 text-blue-500" />{tag}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* View toggle */}
            <div className="flex gap-1 border rounded-md p-1 h-10 self-start">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-2 rounded transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
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
              <Button onClick={() => router.push('/admin/exams/new')}>
                <Plus className="mr-2 h-4 w-4" />Create First Exam
              </Button>
            )}
          </CardContent>
        </Card>

      ) : viewMode === 'grid' ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map(exam => <ExamCard key={exam.id} exam={exam} />)}
        </div>

      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExams.map(exam => {
                  const toggling = togglingId === exam.id
                  return (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium max-w-[180px] truncate" title={exam.title}>
                        {exam.title}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${getSubjectGradient(exam.subject)} flex items-center justify-center`}>
                            <span className="text-white text-xs font-bold">{getSubjectInitial(exam.subject)}</span>
                          </div>
                          {exam.subject}
                        </div>
                      </TableCell>
                      {/* ← ADDED: tags column in list view */}
                      <TableCell>
                        {exam.tags && exam.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {exam.tags.map(tag => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getDifficultyColor(exam.difficulty)}>{exam.difficulty}</Badge>
                      </TableCell>
                      <TableCell>{exam.duration}min</TableCell>
                      <TableCell>{exam.totalQuestions}</TableCell>
                      <TableCell>{exam.totalAttempts}</TableCell>
                      <TableCell>
                        {exam.isFree
                          ? <span className="text-green-600 font-medium">Free</span>
                          : <span>₹{(exam.price / 100).toFixed(2)}</span>
                        }
                      </TableCell>
                      <TableCell>
                        <Badge className={exam.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                          {exam.isPublished ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/exams/${exam.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/exams/${exam.id}/edit`)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={toggling}
                            onClick={() => handleTogglePublish(exam)}
                            title={exam.isPublished ? 'Unpublish' : 'Publish'}
                          >
                            {toggling
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : exam.isPublished
                                ? <EyeOff className="h-4 w-4 text-orange-500" />
                                : <Globe className="h-4 w-4 text-green-600" />
                            }
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => confirmDelete(exam)}>
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
            <AlertDialogTitle>Delete Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>&quot;{examToDelete?.title}&quot;</strong>?
              This action cannot be undone and will delete all related attempt data.
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