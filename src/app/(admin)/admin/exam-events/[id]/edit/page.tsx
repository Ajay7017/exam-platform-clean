'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Save, Loader2, Plus, Trash2, ExternalLink,
  Globe, EyeOff, CheckCircle2, Clock, XCircle, GripVertical
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
  const [newResource, setNewResource] = useState({
    label: '',
    type: 'QUESTION_PAPER',
    driveLink: '',
    status: 'COMING_SOON',
    sortOrder: 0,
  })

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
      }

      const res = await fetch(`/api/admin/exam-events/${id}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add resource')

      setResources(prev => [...prev, data.resource])
      setNewResource({ label: '', type: 'QUESTION_PAPER', driveLink: '', status: 'COMING_SOON', sortOrder: 0 })
      toast.success('Resource added successfully')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsAddingResource(false)
    }
  }

  // Update resource field inline
  const handleUpdateResource = async (resourceId: string, field: string, value: string) => {
    // Optimistic update
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
          status: updated.status,
          sortOrder: updated.sortOrder,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')
      toast.success('Resource updated')
    } catch (err: any) {
      toast.error(err.message)
      // Revert on error
      setResources(prev =>
        prev.map(r => r.id === resourceId ? { ...r, [field]: resources.find(x => x.id === resourceId)?.[field] } : r)
      )
    } finally {
      setSavingResourceId(null)
    }
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

        {/* Publish toggle */}
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

        {/* Save button */}
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
            Question paper, answer key, solutions — manage status and drive links here.
          </p>
        </div>

        {/* Existing resources */}
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {resources.length === 0 ? (
            <p className="px-6 py-6 text-sm text-gray-400 text-center">
              No resources yet. Add one below.
            </p>
          ) : (
            resources.map(resource => {
              const statusConf = STATUS_CONFIG[resource.status as keyof typeof STATUS_CONFIG]
              const StatusIcon = statusConf.icon
              return (
                <div key={resource.id} className="px-6 py-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <GripVertical className="w-4 h-4 text-gray-300 mt-2 shrink-0" />
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Label */}
                      <input
                        type="text"
                        value={resource.label}
                        onChange={e => setResources(prev => prev.map(r => r.id === resource.id ? { ...r, label: e.target.value } : r))}
                        onBlur={e => handleUpdateResource(resource.id, 'label', e.target.value)}
                        className={inputClass}
                        placeholder="Label"
                      />

                      {/* Type */}
                      <select
                        value={resource.type}
                        onChange={e => handleUpdateResource(resource.id, 'type', e.target.value)}
                        className={inputClass}
                      >
                        {RESOURCE_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>

                      {/* Status */}
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

                    {/* Delete */}
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

                  {/* Drive Link */}
                  <div className="ml-7 flex items-center gap-2">
                    <input
                      type="url"
                      value={resource.driveLink || ''}
                      onChange={e => setResources(prev => prev.map(r => r.id === resource.id ? { ...r, driveLink: e.target.value } : r))}
                      onBlur={e => handleUpdateResource(resource.id, 'driveLink', e.target.value)}
                      className={`${inputClass} flex-1`}
                      placeholder="https://drive.google.com/... (paste link here)"
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
              )
            })
          )}
        </div>

        {/* Add new resource form */}
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
          <div className="flex gap-3">
            <input
              type="url"
              value={newResource.driveLink}
              onChange={e => setNewResource(prev => ({ ...prev, driveLink: e.target.value }))}
              className={`${inputClass} flex-1`}
              placeholder="https://drive.google.com/... (optional, can add later)"
            />
            <button
              type="button"
              onClick={handleAddResource}
              disabled={isAddingResource || !newResource.label.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
            >
              {isAddingResource
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Plus className="w-4 h-4" />
              }
              Add
            </button>
          </div>
        </div>
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