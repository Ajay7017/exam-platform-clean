// src/app(admin)/admin/bundles/[id]/edit/page.tsx
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  ArrowLeft, Loader2, Save, Search, X, Package, Layers,
  CheckSquare, Square, Clock, FileQuestion, IndianRupee,
  Image as ImageIcon,
} from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ── types ─────────────────────────────────────────────────────────────────

interface Exam {
  id: string
  title: string
  slug: string
  subject: string
  subjectSlug: string
  duration: number
  totalQuestions: number
  totalMarks: number
  difficulty: 'easy' | 'medium' | 'hard'
  price: number
  isFree: boolean
  isPublished: boolean
  totalAttempts: number
}

// ── helpers ────────────────────────────────────────────────────────────────

const SUBJECT_GRADIENTS = [
  'from-violet-500 to-purple-700',
  'from-blue-500 to-cyan-700',
  'from-emerald-500 to-teal-700',
  'from-orange-500 to-amber-700',
  'from-pink-500 to-rose-700',
  'from-indigo-500 to-blue-700',
]

function getSubjectGradient(subject: string) {
  let hash = 0
  for (let i = 0; i < subject.length; i++) hash = subject.charCodeAt(i) + ((hash << 5) - hash)
  return SUBJECT_GRADIENTS[Math.abs(hash) % SUBJECT_GRADIENTS.length]
}

function formatPrice(paise: number) {
  return `₹${(paise / 100).toFixed(0)}`
}

const difficultyColor: Record<string, string> = {
  easy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  hard: 'bg-red-50 text-red-700 border-red-200',
}

function generateSlug(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ── component ──────────────────────────────────────────────────────────────

export default function EditBundlePage() {
  const router = useRouter()
  const params = useParams()
  const bundleId = params.id as string

  const [loadingInitial, setLoadingInitial] = useState(true)
  const [allExams, setAllExams] = useState<Exam[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loadingExams, setLoadingExams] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [thumbnailUploading, setThumbnailUploading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: 0,
    discount: 0,
    validityDays: 365,
    thumbnail: '',
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [publishedFilter, setPublishedFilter] = useState('all')

  // ── fetch bundle + ALL exams on mount ─────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      setLoadingInitial(true)
      try {
        const [bundleRes, examsRes] = await Promise.all([
          fetch(`/api/admin/bundles/${bundleId}`),
          fetch('/api/admin/exams?limit=500'),
        ])
        if (!bundleRes.ok) throw new Error('Bundle not found')
        if (!examsRes.ok) throw new Error('Failed to load exams')

        const bundleData = await bundleRes.json()
        const examsData = await examsRes.json()

        setFormData({
          name: bundleData.name,
          slug: bundleData.slug,
          description: bundleData.description || '',
          price: bundleData.price,
          discount: bundleData.discount,
          validityDays: bundleData.validityDays,
          thumbnail: bundleData.thumbnail || '',
        })

        setSelectedIds(bundleData.exams.map((e: any) => e.id))

        // ALL exams — no published filter
        const allFetched: Exam[] = examsData.exams || []

        // Ensure currently-selected exams are included even if not in the list
        const bundleExams: Exam[] = bundleData.exams.map((e: any) => ({
          id: e.id,
          title: e.title,
          slug: e.slug,
          subject: e.subject,
          subjectSlug: e.subjectSlug,
          duration: e.duration,
          totalQuestions: e.totalQuestions,
          totalMarks: e.totalMarks,
          difficulty: e.difficulty,
          price: e.price,
          isFree: e.isFree,
          isPublished: e.isPublished,
          totalAttempts: 0,
        }))

        const merged = [
          ...allFetched,
          ...bundleExams.filter(e => !allFetched.find((f: Exam) => f.id === e.id)),
        ]
        setAllExams(merged)

      } catch (err: any) {
        toast.error(err.message || 'Failed to load bundle')
        router.push('/admin/bundles')
      } finally {
        setLoadingInitial(false)
        setLoadingExams(false)
      }
    }
    init()
  }, [bundleId])

  // ── thumbnail upload ──────────────────────────────────────────────────────

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

  // ── derived ───────────────────────────────────────────────────────────────

  const subjects = useMemo(() =>
    Array.from(new Map(allExams.map(e => [e.subjectSlug, e.subject])).entries())
      .map(([slug, name]) => ({ slug, name }))
  , [allExams])

  const filteredExams = useMemo(() => allExams.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchSubject = subjectFilter === 'all' || e.subjectSlug === subjectFilter
    const matchDiff = difficultyFilter === 'all' || e.difficulty === difficultyFilter
    const matchPublished =
      publishedFilter === 'all' ||
      (publishedFilter === 'published' && e.isPublished) ||
      (publishedFilter === 'draft' && !e.isPublished)
    return matchSearch && matchSubject && matchDiff && matchPublished
  }), [allExams, searchQuery, subjectFilter, difficultyFilter, publishedFilter])

  const selectedExams = useMemo(() =>
    selectedIds.map(id => allExams.find(e => e.id === id)).filter(Boolean) as Exam[]
  , [selectedIds, allExams])

  const areAllFilteredSelected = useMemo(() =>
    filteredExams.length > 0 && filteredExams.every(e => selectedIds.includes(e.id))
  , [filteredExams, selectedIds])

  const totalMarketValue = useMemo(() =>
    selectedExams.filter(e => !e.isFree).reduce((sum, e) => sum + e.price, 0)
  , [selectedExams])

  const discountAmount = Math.round(formData.price * (formData.discount / 100))
  const finalPrice = formData.price - discountAmount
  const savings = Math.max(0, totalMarketValue - finalPrice)

  // ── handlers ─────────────────────────────────────────────────────────────

  const handleNameChange = (name: string) => {
    setFormData(p => ({ ...p, name, slug: generateSlug(name) }))
  }

  const handlePriceChange = (rupees: string) => {
    const paise = Math.round(parseFloat(rupees || '0') * 100)
    setFormData(p => ({ ...p, price: isNaN(paise) ? 0 : paise }))
  }

  const toggleExam = useCallback((id: string) => {
    setSelectedIds(p => p.includes(id) ? p.filter(e => e !== id) : [...p, id])
  }, [])

  const removeSelected = useCallback((id: string) => {
    setSelectedIds(p => p.filter(e => e !== id))
  }, [])

  const selectAllFiltered = useCallback(() => {
    const ids = filteredExams.map(e => e.id)
    setSelectedIds(p => {
      const allSel = ids.every(id => p.includes(id))
      return allSel ? p.filter(id => !ids.includes(id)) : [...p, ...ids.filter(id => !p.includes(id))]
    })
  }, [filteredExams])

  const canSubmit = formData.name.trim() && formData.slug.trim() && selectedIds.length >= 1 && formData.price > 0

  const handleSubmit = async () => {
    if (!canSubmit) { toast.error('Fill all required fields and select at least 1 exam'); return }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/bundles/${bundleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          price: formData.price,
          discount: formData.discount,
          validityDays: formData.validityDays,
          examIds: selectedIds,
          thumbnail: formData.thumbnail || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update bundle')
      toast.success('Bundle updated successfully!')
      router.push('/admin/bundles')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update bundle')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingInitial) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500">Loading bundle data...</p>
        </div>
      </div>
    )
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50/50">

      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin/bundles')} className="-ml-2">
              <ArrowLeft className="mr-2 h-4 w-4" />Back
            </Button>
            <div className="h-5 w-px bg-gray-200" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Edit Bundle</h1>
              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[300px]">{formData.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/admin/bundles')} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
              {submitting
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                : <><Save className="h-4 w-4 mr-2" />Save Changes</>
              }
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">

          {/* ── LEFT: Form ── */}
          <div className="space-y-4 lg:sticky lg:top-6">

            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-purple-500" />Bundle Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <div>
                  <Label className="text-xs font-medium text-gray-600">Bundle Name *</Label>
                  <Input value={formData.name} onChange={e => handleNameChange(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600">Slug *</Label>
                  <Input
                    value={formData.slug}
                    onChange={e => setFormData(p => ({ ...p, slug: e.target.value }))}
                    className="mt-1 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">Changing slug will break existing links.</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    rows={4}
                    className="mt-1"
                    placeholder={`Each line will appear as a separate point:\nNTA-Like Simulation\n18 Total Tests`}
                  />
                  <p className="text-xs text-gray-400 mt-1">Each new line shows as a separate item on the card.</p>
                </div>

                {/* Thumbnail */}
                <div>
                  <Label className="text-xs font-medium text-gray-600">Bundle Thumbnail</Label>
                  <p className="text-xs text-gray-400 mt-0.5 mb-2">
                    Optional — shown on bundle cards.
                  </p>
                  {formData.thumbnail ? (
                    <div className="relative w-full h-36 rounded-lg overflow-hidden border border-gray-200 group">
                      <img src={formData.thumbnail} alt="Thumbnail preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, thumbnail: '' }))}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                      thumbnailUploading ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span className="text-xs">Uploading...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-gray-400">
                          <ImageIcon className="h-6 w-6" />
                          <span className="text-xs font-medium">Click to upload thumbnail</span>
                          <span className="text-xs">JPG, PNG, WEBP — max 10MB</span>
                        </div>
                      )}
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-green-500" />Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-600">Bundle Price (₹) *</Label>
                    <Input
                      type="number" min="0" step="1"
                      value={formData.price > 0 ? (formData.price / 100).toFixed(0) : ''}
                      onChange={e => handlePriceChange(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600">Discount (%)</Label>
                    <Input
                      type="number" min="0" max="100"
                      value={formData.discount || ''}
                      onChange={e => setFormData(p => ({ ...p, discount: Math.min(100, parseInt(e.target.value) || 0) }))}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600">Validity (Days)</Label>
                  <Select value={String(formData.validityDays)} onValueChange={v => setFormData(p => ({ ...p, validityDays: parseInt(v) }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year (365 days)</SelectItem>
                      <SelectItem value="730">2 years (730 days)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.price > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Base price</span><span className="font-medium">{formatPrice(formData.price)}</span>
                    </div>
                    {formData.discount > 0 && (
                      <div className="flex justify-between text-orange-600">
                        <span>Discount ({formData.discount}%)</span><span>— {formatPrice(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1.5 mt-1.5">
                      <span>Final price</span><span>{formatPrice(finalPrice)}</span>
                    </div>
                    {selectedExams.length > 0 && totalMarketValue > 0 && (
                      <div className="flex justify-between text-green-600 text-xs pt-1">
                        <span>Individual exams total</span><span>{formatPrice(totalMarketValue)}</span>
                      </div>
                    )}
                    {savings > 0 && (
                      <div className="flex justify-between text-green-700 font-medium text-xs">
                        <span>Student saves</span><span>{formatPrice(savings)}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedExams.length > 0 && (
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold">
                    Selected Exams
                    <span className="ml-2 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full text-xs">{selectedIds.length}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {selectedExams.map((exam, i) => (
                      <div key={exam.id} className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 bg-white group">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-semibold">{i + 1}</span>
                        <p className="flex-1 text-xs text-gray-700 truncate">{exam.title}</p>
                        {!exam.isPublished && (
                          <span className="shrink-0 text-xs px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Draft</span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeSelected(exam.id)}
                          className="shrink-0 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── RIGHT: Exam Picker ── */}
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-500" />Select Exams to Include *
                  <span className="text-xs text-gray-400 font-normal">(all exams shown)</span>
                </CardTitle>
                {filteredExams.length > 0 && (
                  <Button type="button" variant="outline" size="sm" onClick={selectAllFiltered} className="text-xs">
                    {areAllFilteredSelected
                      ? <><CheckSquare className="h-3.5 w-3.5 mr-1" />Deselect All</>
                      : <><Square className="h-3.5 w-3.5 mr-1" />Select All</>
                    }
                  </Button>
                )}
              </div>
              <div className="flex gap-2 flex-wrap mt-3">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search exams..."
                    className="w-full h-8 pl-8 pr-8 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Subjects" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map(s => <SelectItem key={s.slug} value={s.slug}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Levels" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={publishedFilter} onValueChange={setPublishedFilter}>
                  <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                <span>Showing <strong className="text-gray-700">{filteredExams.length}</strong> of <strong className="text-gray-700">{allExams.length}</strong> exams</span>
                {selectedIds.length > 0 && <span className="text-blue-600 font-medium">{selectedIds.length} selected</span>}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingExams ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  <p className="text-sm text-gray-400">Loading exams...</p>
                </div>
              ) : filteredExams.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Search className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm font-medium">No exams match your filters</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[calc(100vh-320px)] overflow-y-auto">
                  {filteredExams.map(exam => {
                    const isSelected = selectedIds.includes(exam.id)
                    const gradient = getSubjectGradient(exam.subject)
                    return (
                      <div
                        key={exam.id}
                        className={`p-4 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 hover:bg-blue-100/80' : 'bg-white hover:bg-gray-50'}`}
                        onClick={() => toggleExam(exam.id)}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 cursor-pointer"
                            checked={isSelected}
                            onChange={() => toggleExam(exam.id)}
                            onClick={e => e.stopPropagation()}
                          />
                          <div className={`shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center mt-0.5`}>
                            <span className="text-white text-xs font-bold">{exam.subject?.[0]?.toUpperCase() || '?'}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-gray-900 truncate">{exam.title}</p>
                              {!exam.isPublished && (
                                <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 font-medium">
                                  Draft
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className="text-xs text-gray-500">{exam.subject}</span>
                              <span className="text-gray-300">·</span>
                              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="h-2.5 w-2.5" />{exam.duration}min
                              </span>
                              <span className="text-gray-300">·</span>
                              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                <FileQuestion className="h-2.5 w-2.5" />{exam.totalQuestions}Q
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium capitalize ${difficultyColor[exam.difficulty] || ''}`}>
                                {exam.difficulty}
                              </span>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            {exam.isFree
                              ? <span className="text-xs font-semibold text-green-600">Free</span>
                              : <span className="text-xs font-semibold text-gray-900">{formatPrice(exam.price)}</span>
                            }
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

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-lg lg:left-64">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {selectedIds.length > 0 ? (
              <>
                <span><strong className="text-gray-900">{selectedIds.length}</strong> exams selected</span>
                {formData.price > 0 && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span>Final price: <strong className="text-gray-900">{formatPrice(finalPrice)}</strong></span>
                    {savings > 0 && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="text-green-600">Saves {formatPrice(savings)}</span>
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <span className="text-gray-400 text-xs">Select at least one exam to save</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/admin/bundles')} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
              {submitting
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                : <><Save className="mr-2 h-4 w-4" />Save Changes</>
              }
            </Button>
          </div>
        </div>
      </div>

    </div>
  )
}