'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const RichTextEditor = dynamic(
  () => import('@/components/admin/RichTextEditor').then(m => m.RichTextEditor),
  { ssr: false, loading: () => <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" /> }
)
import {
  ArrowLeft, Save, Loader2, Plus, Trash2, ExternalLink,
  Globe, EyeOff, CheckCircle2, Clock, XCircle, GripVertical,
  Upload, FileText, X
} from 'lucide-react'
import { toast } from 'sonner'

const RESOURCE_TYPES = [
  { value: 'QUESTION_PAPER', label: 'Question Paper' },
  { value: 'ANSWER_KEY', label: 'Answer Key' },
  { value: 'SOLUTIONS', label: 'Solutions / Explanations' },
  { value: 'OTHER', label: 'Other' },
]

const STATUS_CONFIG = {
  COMING_SOON: { label: 'Coming Soon', icon: Clock, className: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
  LIVE: { label: 'Live', icon: CheckCircle2, className: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
  REMOVED: { label: 'Removed', icon: XCircle, className: 'text-gray-400 bg-gray-100 dark:bg-gray-800' },
}

function generateSlug(title: string) {
  return title.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function EditExamEventPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState('')
  const [eventStatus, setEventStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT')

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    examDate: '',
    calculatorEnabled: false,
    totalQuestions: 180,
    totalMarks: 720,
    correctMarks: 4,
    negativeMarks: 1,
    cutoffGeneral: '',
    cutoffOBC: '',
    cutoffSC: '',
    cutoffST: '',
    metaTitle: '',
    metaDescription: '',
    popupEnabled: false,
    popupMessage: '',
    popupLinkLabel: '',
  })

  // Resources state
  const [resources, setResources] = useState<any[]>([])
  const [isAddingResource, setIsAddingResource] = useState(false)
  const [savingResourceId, setSavingResourceId] = useState<string | null>(null)
  const [deletingResourceId, setDeletingResourceId] = useState<string | null>(null)
  const [uploadingPdfForId, setUploadingPdfForId] = useState<string | null>(null)
  const [isUploadingNewPdf, setIsUploadingNewPdf] = useState(false)
  const [newResource, setNewResource] = useState({
    label: '',
    type: 'QUESTION_PAPER',
    driveLink: '',
    fileUrl: '',
    status: 'COMING_SOON',
    sortOrder: 0,
  })

  // Answer key state
  const [answerKey, setAnswerKey] = useState<{
    sections: { name: string; from: number; to: number }[]
    questions: { number: number; answer: string; explanation: string }[]
  } | null>(null)
  const [isSavingAnswerKey, setIsSavingAnswerKey] = useState(false)
  const [isDeletingAnswerKey, setIsDeletingAnswerKey] = useState(false)
  const [activeSection, setActiveSection] = useState(0)
  const [expandedExplanation, setExpandedExplanation] = useState<number | null>(null)
  const [newSection, setNewSection] = useState({ name: '', from: '', to: '' })
  const [isAddingSection, setIsAddingSection] = useState(false)

  // File input refs
  const newPdfInputRef = useRef<HTMLInputElement>(null)
  const existingPdfInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Load event data
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/admin/exam-events/${id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load')

        const ev = data.examEvent
        setEventStatus(ev.status)
        setResources(ev.resources || [])
        // Load answer key
        try {
          const akRes = await fetch(`/api/admin/exam-events/${id}/answer-key`)
          if (akRes.ok) {
            const akData = await akRes.json()
            if (akData.answerKey) setAnswerKey(akData.answerKey)
          }
        } catch {
          // answer key not found is fine
        }
        setFormData({
          title: ev.title || '',
          slug: ev.slug || '',
          description: ev.description || '',
          examDate: ev.examDate
            ? new Date(ev.examDate).toISOString().slice(0, 16)
            : '',
          calculatorEnabled: ev.calculatorEnabled,
          totalQuestions: ev.totalQuestions,
          totalMarks: ev.totalMarks,
          correctMarks: ev.correctMarks,
          negativeMarks: ev.negativeMarks,
          cutoffGeneral: ev.cutoffGeneral ?? '',
          cutoffOBC: ev.cutoffOBC ?? '',
          cutoffSC: ev.cutoffSC ?? '',
          cutoffST: ev.cutoffST ?? '',
          metaTitle: ev.metaTitle || '',
          metaDescription: ev.metaDescription || '',
          popupEnabled: ev.popupEnabled,
          popupMessage: ev.popupMessage || '',
          popupLinkLabel: ev.popupLinkLabel || '',
        })
      } catch (err: any) {
        toast.error(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchEvent()
  }, [id])

  // Save event settings
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError('')

    try {
      const payload = {
        ...formData,
        examDate: formData.examDate ? new Date(formData.examDate).toISOString() : undefined,
        cutoffGeneral: formData.cutoffGeneral !== '' ? Number(formData.cutoffGeneral) : undefined,
        cutoffOBC: formData.cutoffOBC !== '' ? Number(formData.cutoffOBC) : undefined,
        cutoffSC: formData.cutoffSC !== '' ? Number(formData.cutoffSC) : undefined,
        cutoffST: formData.cutoffST !== '' ? Number(formData.cutoffST) : undefined,
        description: formData.description || undefined,
        metaTitle: formData.metaTitle || undefined,
        metaDescription: formData.metaDescription || undefined,
        popupMessage: formData.popupMessage || undefined,
        popupLinkLabel: formData.popupLinkLabel || undefined,
      }

      const res = await fetch(`/api/admin/exam-events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      toast.success('Event settings saved successfully')
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Toggle publish
  const handlePublishToggle = async () => {
    setIsPublishing(true)
    try {
      const res = await fetch(`/api/admin/exam-events/${id}/publish`, {
        method: 'POST'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update status')
      setEventStatus(data.status)
      toast.success(data.message)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsPublishing(false)
    }
  }

  // Upload PDF for existing resource
  const handleUploadPdfForResource = async (resourceId: string, file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('PDF must be under 20MB')
      return
    }

    setUploadingPdfForId(resourceId)
    try {
      const formData = new FormData()
      formData.append('pdf', file)

      const uploadRes = await fetch(`/api/admin/exam-events/${id}/resources/upload`, {
        method: 'POST',
        body: formData,
      })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed')

      // Save fileUrl to resource
      await handleUpdateResource(resourceId, 'fileUrl', uploadData.url)
      toast.success('PDF uploaded successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload PDF')
    } finally {
      setUploadingPdfForId(null)
    }
  }

  // Upload PDF for new resource (before adding)
  const handleUploadPdfForNew = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('PDF must be under 20MB')
      return
    }

    setIsUploadingNewPdf(true)
    try {
      const fd = new FormData()
      fd.append('pdf', file)

      const uploadRes = await fetch(`/api/admin/exam-events/${id}/resources/upload`, {
        method: 'POST',
        body: fd,
      })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed')

      setNewResource(prev => ({ ...prev, fileUrl: uploadData.url }))
      toast.success('PDF ready — click Add to save the resource')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload PDF')
    } finally {
      setIsUploadingNewPdf(false)
    }
  }

  // Add resource
  const handleAddResource = async () => {
    if (!newResource.label.trim()) {
      toast.error('Resource label is required')
      return
    }

    setIsAddingResource(true)
    try {
      const payload = {
        ...newResource,
        driveLink: newResource.driveLink || undefined,
        fileUrl: newResource.fileUrl || undefined,
      }

      const res = await fetch(`/api/admin/exam-events/${id}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add resource')

      setResources(prev => [...prev, data.resource])
      setNewResource({ label: '', type: 'QUESTION_PAPER', driveLink: '', fileUrl: '', status: 'COMING_SOON', sortOrder: 0 })
      toast.success('Resource added successfully')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsAddingResource(false)
    }
  }

  // Update resource field inline
  const handleUpdateResource = async (resourceId: string, field: string, value: string) => {
    setResources(prev =>
      prev.map(r => r.id === resourceId ? { ...r, [field]: value } : r)
    )

    setSavingResourceId(resourceId)
    try {
      const resource = resources.find(r => r.id === resourceId)
      const updated = { ...resource, [field]: value }

      const res = await fetch(`/api/admin/exam-events/${id}/resources/${resourceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: updated.label,
          type: updated.type,
          driveLink: updated.driveLink || undefined,
          fileUrl: updated.fileUrl || undefined,
          status: updated.status,
          sortOrder: updated.sortOrder,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')
    } catch (err: any) {
      toast.error(err.message)
      setResources(prev =>
        prev.map(r => r.id === resourceId ? { ...r, [field]: resources.find(x => x.id === resourceId)?.[field] } : r)
      )
    } finally {
      setSavingResourceId(null)
    }
  }

  // Remove uploaded PDF from existing resource
  const handleRemovePdf = async (resourceId: string) => {
    await handleUpdateResource(resourceId, 'fileUrl', '')
    toast.success('PDF removed')
  }

  // Delete resource
  const handleDeleteResource = async (resourceId: string, label: string) => {
    const confirmed = window.confirm(`Delete resource "${label}"?`)
    if (!confirmed) return

    setDeletingResourceId(resourceId)
    try {
      const res = await fetch(`/api/admin/exam-events/${id}/resources/${resourceId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete')
      setResources(prev => prev.filter(r => r.id !== resourceId))
      toast.success('Resource deleted')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDeletingResourceId(null)
    }
  }

  // ── Answer Key Handlers ────────────────────────────────────────────────

  const handleInitAnswerKey = () => {
    setAnswerKey({
      sections: [
        { name: 'Physics', from: 1, to: 45 },
        { name: 'Chemistry', from: 46, to: 90 },
        { name: 'Biology', from: 91, to: 180 },
      ],
      questions: Array.from({ length: 180 }, (_, i) => ({
        number: i + 1,
        answer: '',
        explanation: '',
      })),
    })
  }

  const handleAddSection = () => {
    if (!newSection.name.trim() || !newSection.from || !newSection.to) {
      toast.error('Fill in section name, from and to question numbers')
      return
    }
    const from = parseInt(newSection.from)
    const to = parseInt(newSection.to)
    if (from >= to) {
      toast.error('From must be less than To')
      return
    }
    setAnswerKey(prev => {
      if (!prev) return prev
      // generate questions for this range if not already present
      const existingNums = new Set(prev.questions.map(q => q.number))
      const newQuestions = []
      for (let i = from; i <= to; i++) {
        if (!existingNums.has(i)) {
          newQuestions.push({ number: i, answer: '', explanation: '' })
        }
      }
      return {
        sections: [...prev.sections, { name: newSection.name.trim(), from, to }],
        questions: [...prev.questions, ...newQuestions].sort((a, b) => a.number - b.number),
      }
    })
    setNewSection({ name: '', from: '', to: '' })
    setIsAddingSection(false)
  }

  const handleDeleteSection = (index: number) => {
    setAnswerKey(prev => {
      if (!prev) return prev
      const sections = prev.sections.filter((_, i) => i !== index)
      return { ...prev, sections }
    })
    if (activeSection >= index && activeSection > 0) {
      setActiveSection(prev => prev - 1)
    }
  }

  const handleSetAnswer = (questionNumber: number, answer: string) => {
    setAnswerKey(prev => {
      if (!prev) return prev
      return {
        ...prev,
        questions: prev.questions.map(q =>
          q.number === questionNumber
            ? { ...q, answer: q.answer === answer ? '' : answer }
            : q
        ),
      }
    })
  }

  const handleSetExplanation = (questionNumber: number, explanation: string) => {
    setAnswerKey(prev => {
      if (!prev) return prev
      return {
        ...prev,
        questions: prev.questions.map(q =>
          q.number === questionNumber ? { ...q, explanation } : q
        ),
      }
    })
  }

  const handleSaveAnswerKey = async () => {
    if (!answerKey) return
    if (answerKey.sections.length === 0) {
      toast.error('Add at least one section before saving')
      return
    }
    const answeredCount = answerKey.questions.filter(q => q.answer).length
    if (answeredCount === 0) {
      toast.error('Add at least one answer before saving')
      return
    }

    setIsSavingAnswerKey(true)
    try {
      const res = await fetch(`/api/admin/exam-events/${id}/answer-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: answerKey.sections,
          questions: answerKey.questions.filter(q => q.answer), // only save questions with answers
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save answer key')
      toast.success(`Answer key saved — ${answeredCount} answers`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSavingAnswerKey(false)
    }
  }

  const handleDeleteAnswerKey = async () => {
    const confirmed = window.confirm('Delete the entire answer key? This cannot be undone.')
    if (!confirmed) return

    setIsDeletingAnswerKey(true)
    try {
      const res = await fetch(`/api/admin/exam-events/${id}/answer-key`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete')
      setAnswerKey(null)
      setActiveSection(0)
      setExpandedExplanation(null)
      toast.success('Answer key deleted')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsDeletingAnswerKey(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/exam-events"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Exam Event</h1>
            <p className="text-sm text-gray-500">{formData.title}</p>
          </div>
        </div>

        <button
          onClick={handlePublishToggle}
          disabled={isPublishing}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
            eventStatus === 'PUBLISHED'
              ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          {isPublishing
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : eventStatus === 'PUBLISHED'
              ? <><Globe className="w-4 h-4" /> Published</>
              : <><EyeOff className="w-4 h-4" /> Draft</>
          }
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <Section title="Basic Information">
          <Field label="Event Title *">
            <input required type="text" value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={inputClass} placeholder="e.g. NEET 2026 Answer Key" />
          </Field>

          <Field label="Slug *" hint="Used in the page URL — change carefully if already published.">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 shrink-0">/exam-events/</span>
              <input required type="text" value={formData.slug}
                onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                className={inputClass} placeholder="neet-2026-answer-key" />
            </div>
          </Field>

          <Field label="Description">
            <textarea rows={3} value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={`${inputClass} resize-none`}
              placeholder="Brief description about this exam event..." />
          </Field>

          <Field label="Exam Date">
            <input type="datetime-local" value={formData.examDate}
              onChange={e => setFormData(prev => ({ ...prev, examDate: e.target.value }))}
              className={inputClass} />
          </Field>
        </Section>

        {/* Score Calculator */}
        <Section title="Score Calculator">
          <div className="flex items-center gap-3">
            <input type="checkbox" id="calcEnabled" checked={formData.calculatorEnabled}
              onChange={e => setFormData(prev => ({ ...prev, calculatorEnabled: e.target.checked }))}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
            <label htmlFor="calcEnabled" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Enable Score Calculator on the public page
            </label>
          </div>

          {formData.calculatorEnabled && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <Field label="Total Questions">
                  <input type="number" value={formData.totalQuestions}
                    onChange={e => setFormData(prev => ({ ...prev, totalQuestions: Number(e.target.value) }))}
                    className={inputClass} min={1} />
                </Field>
                <Field label="Total Marks">
                  <input type="number" value={formData.totalMarks}
                    onChange={e => setFormData(prev => ({ ...prev, totalMarks: Number(e.target.value) }))}
                    className={inputClass} min={1} />
                </Field>
                <Field label="Marks / Correct">
                  <input type="number" value={formData.correctMarks}
                    onChange={e => setFormData(prev => ({ ...prev, correctMarks: Number(e.target.value) }))}
                    className={inputClass} min={0} step={0.25} />
                </Field>
                <Field label="Negative Marks">
                  <input type="number" value={formData.negativeMarks}
                    onChange={e => setFormData(prev => ({ ...prev, negativeMarks: Number(e.target.value) }))}
                    className={inputClass} min={0} step={0.25} />
                </Field>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-3">Expected Cutoffs (optional)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(['General', 'OBC', 'SC', 'ST'] as const).map(cat => (
                    <Field key={cat} label={cat}>
                      <input type="number"
                        value={formData[`cutoff${cat}` as keyof typeof formData] as string}
                        onChange={e => setFormData(prev => ({ ...prev, [`cutoff${cat}`]: e.target.value }))}
                        className={inputClass} placeholder="—" min={0} />
                    </Field>
                  ))}
                </div>
              </div>
            </>
          )}
        </Section>

        {/* Popup Banner */}
        <Section title="Homepage Popup Banner">
          <div className="flex items-center gap-3">
            <input type="checkbox" id="popupEnabled" checked={formData.popupEnabled}
              onChange={e => setFormData(prev => ({ ...prev, popupEnabled: e.target.checked }))}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
            <label htmlFor="popupEnabled" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Show popup banner on homepage
            </label>
          </div>

          {formData.popupEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <Field label="Popup Message">
                <input type="text" value={formData.popupMessage}
                  onChange={e => setFormData(prev => ({ ...prev, popupMessage: e.target.value }))}
                  className={inputClass} placeholder="NEET 2026 Answer Key is live!" />
              </Field>
              <Field label="Button Label">
                <input type="text" value={formData.popupLinkLabel}
                  onChange={e => setFormData(prev => ({ ...prev, popupLinkLabel: e.target.value }))}
                  className={inputClass} placeholder="View Answer Key" />
              </Field>
            </div>
          )}
        </Section>

        {/* SEO */}
        <Section title="SEO Settings">
          <Field label="Meta Title" hint="Leave blank to use event title.">
            <input type="text" value={formData.metaTitle}
              onChange={e => setFormData(prev => ({ ...prev, metaTitle: e.target.value }))}
              className={inputClass} placeholder="NEET 2026 Answer Key & Solutions — Mockzy" />
          </Field>
          <Field label="Meta Description" hint="Keep under 160 characters.">
            <textarea rows={2} value={formData.metaDescription}
              onChange={e => setFormData(prev => ({ ...prev, metaDescription: e.target.value }))}
              className={`${inputClass} resize-none`}
              placeholder="Download NEET 2026 Answer Key, Question Paper and Solutions PDF..." />
          </Field>
        </Section>

        <div className="flex justify-end">
          <button type="submit" disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm">
            {isSaving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              : <><Save className="w-4 h-4" /> Save Settings</>
            }
          </button>
        </div>
      </form>

      {/* ── Resources Section ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Resources
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Upload PDF directly or paste a Google Drive link as fallback.
          </p>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {resources.length === 0 ? (
            <p className="px-6 py-6 text-sm text-gray-400 text-center">
              No resources yet. Add one below.
            </p>
          ) : (
            resources.map(resource => {
              const statusConf = STATUS_CONFIG[resource.status as keyof typeof STATUS_CONFIG]
              return (
                <div key={resource.id} className="px-6 py-4 space-y-3">
                  {/* Row 1: Label / Type / Status / Delete */}
                  <div className="flex items-start gap-3">
                    <GripVertical className="w-4 h-4 text-gray-300 mt-2 shrink-0" />
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={resource.label}
                        onChange={e => setResources(prev => prev.map(r => r.id === resource.id ? { ...r, label: e.target.value } : r))}
                        onBlur={e => handleUpdateResource(resource.id, 'label', e.target.value)}
                        className={inputClass}
                        placeholder="Label"
                      />
                      <select
                        value={resource.type}
                        onChange={e => handleUpdateResource(resource.id, 'type', e.target.value)}
                        className={inputClass}
                      >
                        {RESOURCE_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <select
                        value={resource.status}
                        onChange={e => handleUpdateResource(resource.id, 'status', e.target.value)}
                        className={`${inputClass} ${statusConf.className}`}
                      >
                        <option value="COMING_SOON">Coming Soon</option>
                        <option value="LIVE">Live</option>
                        <option value="REMOVED">Removed</option>
                      </select>
                    </div>
                    <button
                      onClick={() => handleDeleteResource(resource.id, resource.label)}
                      disabled={deletingResourceId === resource.id}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 mt-0.5"
                    >
                      {deletingResourceId === resource.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />
                      }
                    </button>
                  </div>

                  {/* Row 2: PDF Upload */}
                  <div className="ml-7 space-y-2">
                    {resource.fileUrl ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <FileText className="w-4 h-4 text-green-600 shrink-0" />
                        <span className="text-xs text-green-700 dark:text-green-400 flex-1 truncate">
                          PDF uploaded
                        </span>
                        
                          <a href={resource.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-green-600 hover:underline shrink-0"
                        >
                          Preview
                        </a>
                        <button
                          onClick={() => handleRemovePdf(resource.id)}
                          className="p-0.5 text-green-500 hover:text-red-500 transition-colors shrink-0"
                          title="Remove PDF"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          ref={el => { existingPdfInputRefs.current[resource.id] = el }}
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) handleUploadPdfForResource(resource.id, file)
                            e.target.value = ''
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => existingPdfInputRefs.current[resource.id]?.click()}
                          disabled={uploadingPdfForId === resource.id}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {uploadingPdfForId === resource.id
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</>
                            : <><Upload className="w-3.5 h-3.5" /> Upload PDF</>
                          }
                        </button>
                      </div>
                    )}

                    {/* Drive link fallback */}
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={resource.driveLink || ''}
                        onChange={e => setResources(prev => prev.map(r => r.id === resource.id ? { ...r, driveLink: e.target.value } : r))}
                        onBlur={e => handleUpdateResource(resource.id, 'driveLink', e.target.value)}
                        className={`${inputClass} flex-1`}
                        placeholder="Or paste Google Drive link as fallback..."
                      />
                      {resource.driveLink && (
                        <a href={resource.driveLink} target="_blank" rel="noopener noreferrer"
                          className="p-2 text-blue-500 hover:text-blue-700 shrink-0">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {savingResourceId === resource.id && (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Add new resource */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800 space-y-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Add New Resource</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={newResource.label}
              onChange={e => setNewResource(prev => ({ ...prev, label: e.target.value }))}
              className={inputClass}
              placeholder="Label e.g. Answer Key"
            />
            <select
              value={newResource.type}
              onChange={e => setNewResource(prev => ({ ...prev, type: e.target.value }))}
              className={inputClass}
            >
              {RESOURCE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              value={newResource.status}
              onChange={e => setNewResource(prev => ({ ...prev, status: e.target.value }))}
              className={inputClass}
            >
              <option value="COMING_SOON">Coming Soon</option>
              <option value="LIVE">Live</option>
            </select>
          </div>

          {/* PDF upload for new resource */}
          <div className="space-y-2">
            {newResource.fileUrl ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <FileText className="w-4 h-4 text-green-600 shrink-0" />
                <span className="text-xs text-green-700 dark:text-green-400 flex-1">PDF ready to save</span>
                <button
                  type="button"
                  onClick={() => setNewResource(prev => ({ ...prev, fileUrl: '' }))}
                  className="p-0.5 text-green-500 hover:text-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  ref={newPdfInputRef}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleUploadPdfForNew(file)
                    e.target.value = ''
                  }}
                />
                <button
                  type="button"
                  onClick={() => newPdfInputRef.current?.click()}
                  disabled={isUploadingNewPdf}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isUploadingNewPdf
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</>
                    : <><Upload className="w-3.5 h-3.5" /> Upload PDF</>
                  }
                </button>
                <input
                  type="url"
                  value={newResource.driveLink}
                  onChange={e => setNewResource(prev => ({ ...prev, driveLink: e.target.value }))}
                  className={`${inputClass} flex-1`}
                  placeholder="Or paste Drive link..."
                />
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAddResource}
              disabled={isAddingResource || !newResource.label.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isAddingResource
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Plus className="w-4 h-4" />
              }
              Add Resource
            </button>
          </div>
        </div>
      </div>
        {/* ── Answer Key Section ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Answer Key
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Enter answers and explanations — shown on the public page.
            </p>
          </div>
          {answerKey && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {answerKey.questions.filter(q => q.answer).length} / {answerKey.questions.length} answered
              </span>
              <button
                type="button"
                onClick={handleDeleteAnswerKey}
                disabled={isDeletingAnswerKey}
                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                title="Delete answer key"
              >
                {isDeletingAnswerKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>

        {!answerKey ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-gray-400 mb-4">No answer key yet. Start by initialising one.</p>
            <button
              type="button"
              onClick={handleInitAnswerKey}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Initialise Answer Key
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-6">

            {/* Sections manager */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sections</p>
                <button
                  type="button"
                  onClick={() => setIsAddingSection(s => !s)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {isAddingSection ? 'Cancel' : '+ Add Section'}
                </button>
              </div>

              <div className="space-y-2">
                {answerKey.sections.map((section, index) => (
                  <div key={index} className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">{section.name}</span>
                    <span className="text-xs text-gray-400">Q{section.from} – Q{section.to}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSection(index)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {isAddingSection && (
                <div className="mt-3 flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Section Name</label>
                    <input
                      type="text"
                      value={newSection.name}
                      onChange={e => setNewSection(prev => ({ ...prev, name: e.target.value }))}
                      className={inputClass}
                      placeholder="e.g. Physics"
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-xs text-gray-500 mb-1 block">From Q</label>
                    <input
                      type="number"
                      value={newSection.from}
                      onChange={e => setNewSection(prev => ({ ...prev, from: e.target.value }))}
                      className={inputClass}
                      placeholder="1"
                      min={1}
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-xs text-gray-500 mb-1 block">To Q</label>
                    <input
                      type="number"
                      value={newSection.to}
                      onChange={e => setNewSection(prev => ({ ...prev, to: e.target.value }))}
                      className={inputClass}
                      placeholder="45"
                      min={1}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSection}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors shrink-0"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Section tabs */}
            {answerKey.sections.length > 0 && (
              <div>
                <div className="flex gap-2 mb-4 flex-wrap">
                  {answerKey.sections.map((section, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => { setActiveSection(index); setExpandedExplanation(null) }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        activeSection === index
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {section.name}
                    </button>
                  ))}
                </div>

                {/* Questions for active section */}
                <div className="space-y-1">
                  {answerKey.questions
                    .filter(q => {
                      const sec = answerKey.sections[activeSection]
                      return q.number >= sec.from && q.number <= sec.to
                    })
                    .map(q => (
                      <div key={q.number} className="border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden">
                        <div className="flex items-center gap-3 px-3 py-2">
                          <span className="text-xs font-mono text-gray-400 w-8 shrink-0">Q{q.number}</span>

                          {/* Answer buttons */}
                          <div className="flex gap-1.5">
                            {['A', 'B', 'C', 'D'].map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleSetAnswer(q.number, opt)}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                                  q.answer === opt
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>

                          <div className="flex-1" />

                          {/* Explanation toggle */}
                          <button
                            type="button"
                            onClick={() => setExpandedExplanation(
                              expandedExplanation === q.number ? null : q.number
                            )}
                            className={`text-xs px-2 py-1 rounded transition-colors ${
                              q.explanation
                                ? 'text-green-600 bg-green-50 dark:bg-green-900/20'
                                : 'text-gray-400 hover:text-gray-600 bg-gray-50 dark:bg-gray-800'
                            }`}
                          >
                            {expandedExplanation === q.number
                              ? 'Close'
                              : q.explanation ? 'Edit Explanation' : 'Add Explanation'
                            }
                          </button>
                        </div>

                        {/* Explanation editor */}
                        {expandedExplanation === q.number && (
                          <div className="border-t border-gray-100 dark:border-gray-800 p-3">
                            <p className="text-xs text-gray-400 mb-2">Explanation for Q{q.number}</p>
                            <RichTextEditor
                              value={q.explanation || ''}
                              onChange={val => handleSetExplanation(q.number, val)}
                              placeholder="Type explanation here. Supports math, images, chemistry symbols..."
                              minHeight="80px"
                            />
                          </div>
                        )}
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* Save button */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-400">
                Changes are not auto-saved — click Save when done.
              </span>
              <button
                type="button"
                onClick={handleSaveAnswerKey}
                disabled={isSavingAnswerKey}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSavingAnswerKey
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  : <><Save className="w-4 h-4" /> Save Answer Key</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
  )
}

// ── Reusable helpers ───────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-4">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      {children}
    </div>
  )
}

const inputClass = 'w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm'