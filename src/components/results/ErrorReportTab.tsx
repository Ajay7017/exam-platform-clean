// src/components/results/ErrorReportTab.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle, Loader2, AlertTriangle,
  Plus, ChevronDown, ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'

interface Question {
  questionId: string
  statement:  string
}

interface ErrorReportTabProps {
  examId:          string
  attemptId:       string
  questionResults: Question[]
}

const ISSUE_TYPES = [
  { value: 'wrong_answer',   label: 'Wrong Answer Marked' },
  { value: 'wrong_question', label: 'Wrong / Irrelevant Question' },
  { value: 'typo',           label: 'Typo / Unclear Wording' },
  { value: 'image_issue',    label: 'Image Not Loading / Wrong Image' },
  { value: 'other',          label: 'Other Issue' },
]

interface ReportEntry {
  _key:           string   // stable unique key
  questionId:     string
  questionNumber: number
  issueType:      string
  description:    string
}

let _keyCounter = 0
const emptyEntry = (): ReportEntry => ({
  _key:           `report_${++_keyCounter}`,
  questionId:     '',
  questionNumber: 0,
  issueType:      '',
  description:    '',
})

export function ErrorReportTab({
  examId,
  attemptId,
  questionResults,
}: ErrorReportTabProps) {
  const [reports,    setReports]    = useState<ReportEntry[]>([emptyEntry()])
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState<number[]>([]) // indexes submitted
  const [expanded,   setExpanded]   = useState<number[]>([0])

  const updateReport = (index: number, field: keyof Omit<ReportEntry, '_key'>, value: string | number) => {
    setReports(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  const addReport = () => {
    setReports(prev => [...prev, emptyEntry()])
    setExpanded(prev => [...prev, reports.length])
  }

  const removeReport = (index: number) => {
    setReports(prev => prev.filter((_, i) => i !== index))
    setExpanded(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i))
  }

  const toggleExpand = (index: number) => {
    setExpanded(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    )
  }

  const isValid = (r: ReportEntry) =>
    r.questionId && r.issueType && r.description.trim().length >= 5

  const handleSubmitOne = async (index: number) => {
    const r = reports[index]
    if (!isValid(r)) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/error-reports', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          examId,
          attemptId,
          questionId:     r.questionId,
          questionNumber: r.questionNumber,
          issueType:      r.issueType,
          description:    r.description.trim(),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to submit report')
      }

      setSubmitted(prev => [...prev, index])
      toast.success(`Report for Q${r.questionNumber} submitted!`)
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  // strip html tags for question preview
  const plainText = (html: string) =>
    html.replace(/<[^>]*>/g, '').slice(0, 80) + (html.length > 80 ? '...' : '')

  return (
    <div className="space-y-3">

      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <p className="text-xs text-amber-700">
          Spotted an error in a question? Report it here. Our team will review
          and reply within 24 hours.
        </p>
      </div>

      {reports.map((report, index) => {
        const isSubmitted = submitted.includes(index)
        const isOpen      = expanded.includes(index)

        return (
          <Card
            key={report._key}
            className={isSubmitted ? 'border-green-200 bg-green-50' : ''}
          >
            {/* Card Header — always visible */}
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer"
              onClick={() => toggleExpand(index)}
            >
              <div className="flex items-center gap-2">
                {isSubmitted
                  ? <CheckCircle className="w-4 h-4 text-green-500" />
                  : <AlertTriangle className="w-4 h-4 text-amber-400" />
                }
                <span className="text-sm font-medium text-gray-700">
                  {report.questionNumber
                    ? `Q${report.questionNumber} — ${ISSUE_TYPES.find(t => t.value === report.issueType)?.label || 'Issue'}`
                    : `Report #${index + 1}`
                  }
                </span>
                {isSubmitted && (
                  <Badge className="bg-green-100 text-green-700 text-xs">
                    Submitted
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isSubmitted && reports.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeReport(index) }}
                    className="text-xs text-red-400 hover:text-red-600 px-2"
                  >
                    Remove
                  </button>
                )}
                {isOpen
                  ? <ChevronUp className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />
                }
              </div>
            </div>

            {/* Card Body — collapsible */}
            {isOpen && !isSubmitted && (
              <CardContent className="pt-0 space-y-4 border-t">
                <div className="pt-4 space-y-4">

                  {/* Question Selector */}
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-gray-700">
                      Question <span className="text-red-500">*</span>
                    </p>
                    <Select
                      value={report.questionId}
                      onValueChange={(val) => {
                        const idx = questionResults.findIndex(q => q.questionId === val)
                        updateReport(index, 'questionId',     val)
                        updateReport(index, 'questionNumber', idx + 1)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a question..." />
                      </SelectTrigger>
                      <SelectContent>
                        {questionResults.map((q, qi) => (
                          <SelectItem key={q.questionId} value={q.questionId}>
                            <span className="font-medium">Q{qi + 1}</span>
                            <span className="text-gray-400 ml-2 text-xs">
                              {plainText(q.statement)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Issue Type */}
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-gray-700">
                      Issue Type <span className="text-red-500">*</span>
                    </p>
                    <Select
                      value={report.issueType}
                      onValueChange={(val) => updateReport(index, 'issueType', val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="What's wrong?" />
                      </SelectTrigger>
                      <SelectContent>
                        {ISSUE_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-gray-700">
                      Description <span className="text-red-500">*</span>
                    </p>
                    <Textarea
                      placeholder="Describe the issue clearly..."
                      value={report.description}
                      onChange={(e) => updateReport(index, 'description', e.target.value)}
                      disabled={submitting}
                      maxLength={1000}
                      rows={3}
                      className="resize-none"
                    />
                    <p className="text-xs text-gray-400 text-right">
                      {report.description.length}/1000
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Reply within 24 hours
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleSubmitOne(index)}
                      disabled={!isValid(report) || submitting}
                    >
                      {submitting
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : 'Submit Report'
                      }
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}

            {/* Submitted state body */}
            {isOpen && isSubmitted && (
              <CardContent className="pt-0 border-t">
                <div className="pt-4 text-center space-y-1">
                  <p className="text-sm text-green-700 font-medium">
                    Report submitted successfully!
                  </p>
                  <p className="text-xs text-green-600">
                    Check the Feedback section in your sidebar for admin replies.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}

      {/* Add another report */}
      <button
        onClick={addReport}
        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors px-1"
      >
        <Plus className="w-4 h-4" />
        Report another question
      </button>
    </div>
  )
}