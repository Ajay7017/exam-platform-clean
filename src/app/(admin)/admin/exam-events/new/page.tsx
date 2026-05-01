'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function NewExamEventPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    examDate: '',
    // Calculator
    calculatorEnabled: false,
    totalQuestions: 180,
    totalMarks: 720,
    correctMarks: 4,
    negativeMarks: 1,
    // Cutoffs
    cutoffGeneral: '',
    cutoffOBC: '',
    cutoffSC: '',
    cutoffST: '',
    // SEO
    metaTitle: '',
    metaDescription: '',
    // Popup
    popupEnabled: false,
    popupMessage: '',
    popupLinkLabel: '',
  })

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: generateSlug(title)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
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

      const res = await fetch('/api/admin/exam-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create exam event')

      toast.success('Exam event created! Now add your resources.')
      router.push(`/admin/exam-events/${data.examEvent.id}/edit`)
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/exam-events"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Exam Event</h1>
          <p className="text-sm text-gray-500">Create a new answer key / result page.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <Section title="Basic Information">
          <Field label="Event Title *">
            <input
              required
              type="text"
              value={formData.title}
              onChange={e => handleTitleChange(e.target.value)}
              className={inputClass}
              placeholder="e.g. NEET 2026 Answer Key"
            />
          </Field>

          <Field label="Slug *" hint="Auto-generated from title. Used in the page URL.">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 shrink-0">/exam-events/</span>
              <input
                required
                type="text"
                value={formData.slug}
                onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                className={inputClass}
                placeholder="neet-2026-answer-key"
              />
            </div>
          </Field>

          <Field label="Description" hint="Shown on the public page below the title.">
            <textarea
              rows={3}
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={`${inputClass} resize-none`}
              placeholder="Brief description about this exam event..."
            />
          </Field>

          <Field label="Exam Date" hint="When is this exam happening?">
            <input
              type="datetime-local"
              value={formData.examDate}
              onChange={e => setFormData(prev => ({ ...prev, examDate: e.target.value }))}
              className={inputClass}
            />
          </Field>
        </Section>

        {/* Score Calculator */}
        <Section title="Score Calculator">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="calculatorEnabled"
              checked={formData.calculatorEnabled}
              onChange={e => setFormData(prev => ({ ...prev, calculatorEnabled: e.target.checked }))}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="calculatorEnabled" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Enable Score Calculator on the public page
            </label>
          </div>

          {formData.calculatorEnabled && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
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
          )}

          {formData.calculatorEnabled && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
                Expected Cutoffs (optional — fill after exam)
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(['General', 'OBC', 'SC', 'ST'] as const).map(cat => (
                  <Field key={cat} label={cat}>
                    <input
                      type="number"
                      value={formData[`cutoff${cat}` as keyof typeof formData] as string}
                      onChange={e => setFormData(prev => ({ ...prev, [`cutoff${cat}`]: e.target.value }))}
                      className={inputClass}
                      placeholder="—"
                      min={0}
                    />
                  </Field>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Popup Banner */}
        <Section title="Homepage Popup Banner">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="popupEnabled"
              checked={formData.popupEnabled}
              onChange={e => setFormData(prev => ({ ...prev, popupEnabled: e.target.checked }))}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="popupEnabled" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Show popup banner on homepage
            </label>
          </div>

          {formData.popupEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <Field label="Popup Message" hint='e.g. "NEET 2026 Answer Key is live!"'>
                <input
                  type="text"
                  value={formData.popupMessage}
                  onChange={e => setFormData(prev => ({ ...prev, popupMessage: e.target.value }))}
                  className={inputClass}
                  placeholder="NEET 2026 Answer Key is live!"
                />
              </Field>
              <Field label="Button Label" hint='e.g. "View Answer Key"'>
                <input
                  type="text"
                  value={formData.popupLinkLabel}
                  onChange={e => setFormData(prev => ({ ...prev, popupLinkLabel: e.target.value }))}
                  className={inputClass}
                  placeholder="View Answer Key"
                />
              </Field>
            </div>
          )}
        </Section>

        {/* SEO */}
        <Section title="SEO Settings">
          <Field label="Meta Title" hint="Shown in Google search results. Leave blank to use event title.">
            <input
              type="text"
              value={formData.metaTitle}
              onChange={e => setFormData(prev => ({ ...prev, metaTitle: e.target.value }))}
              className={inputClass}
              placeholder="NEET 2026 Answer Key & Solutions — Mockzy"
            />
          </Field>
          <Field label="Meta Description" hint="Shown in Google search results. Keep under 160 characters.">
            <textarea
              rows={2}
              value={formData.metaDescription}
              onChange={e => setFormData(prev => ({ ...prev, metaDescription: e.target.value }))}
              className={`${inputClass} resize-none`}
              placeholder="Download NEET 2026 Answer Key, Question Paper and Solutions PDF..."
            />
          </Field>
        </Section>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            {isSubmitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
              : <><Save className="w-4 h-4" /> Create & Add Resources</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Reusable layout helpers ────────────────────────────────────────────────

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
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      {children}
    </div>
  )
}

const inputClass = 'w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm'