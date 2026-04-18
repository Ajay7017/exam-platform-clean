// src/app/(admin)/admin/feedback/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MessageSquare, AlertTriangle, Clock,
  CheckCircle, Loader2, Star, ChevronDown,
  ChevronUp, Send, Filter,
} from 'lucide-react'
import { toast } from 'sonner'

// ── types ──────────────────────────────────────────────────────────────────

interface FeedbackItem {
  id:               string
  examId:           string
  attemptId:        string
  difficultyRating: number
  experienceRating: number
  comments:         string | null
  status:           string
  adminReply:       string | null
  repliedAt:        string | null
  createdAt:        string
  user: { id: string; name: string | null; email: string }
  exam: { id: string; title: string; slug: string }
}

interface ErrorReportItem {
  id:             string
  examId:         string
  attemptId:      string
  questionId:     string
  questionNumber: number
  issueType:      string
  description:    string
  status:         string
  adminReply:     string | null
  repliedAt:      string | null
  createdAt:      string
  user:     { id: string; name: string | null; email: string }
  exam:     { id: string; title: string; slug: string }
  question: { id: string; statement: string }
}

interface Meta {
  pendingFeedbackCount: number
  pendingErrorCount:    number
  totalPending:         number
}

// ── helpers ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:      { label: 'Pending',      cls: 'bg-yellow-100 text-yellow-700' },
  acknowledged: { label: 'Acknowledged', cls: 'bg-blue-100 text-blue-700'   },
  fixed:        { label: 'Fixed',        cls: 'bg-green-100 text-green-700'  },
}

const ISSUE_TYPE_LABELS: Record<string, string> = {
  wrong_answer:   'Wrong Answer Marked',
  wrong_question: 'Wrong / Irrelevant Question',
  typo:           'Typo / Unclear Wording',
  image_issue:    'Image Not Loading / Wrong Image',
  other:          'Other Issue',
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
    || STATUS_CONFIG.pending
  return <Badge className={`${cfg.cls} text-xs`}>{cfg.label}</Badge>
}

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${
            s <= value
              ? 'fill-amber-400 text-amber-400'
              : 'text-gray-200'
          }`}
        />
      ))}
    </div>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function plainText(html: string) {
  return html.replace(/<[^>]*>/g, '').slice(0, 100)
    + (html.length > 100 ? '...' : '')
}

// ── Reply Box (inline per card) ────────────────────────────────────────────

function ReplyBox({
  itemId,
  type,
  currentReply,
  currentStatus,
  onSaved,
}: {
  itemId:        string
  type:          'feedback' | 'error'
  currentReply:  string | null
  currentStatus: string
  onSaved:       (reply: string, status: string) => void
}) {
  const [open,       setOpen]       = useState(false)
  const [reply,      setReply]      = useState(currentReply || '')
  const [status,     setStatus]     = useState(currentStatus)
  const [saving,     setSaving]     = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/feedback/${itemId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type, status, adminReply: reply || undefined }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save')
      }
      onSaved(reply, status)
      setOpen(false)
      toast.success('Reply saved!')
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border-t mt-3 pt-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <Send className="w-3 h-3" />
        {currentReply ? 'Edit Reply' : 'Reply'}
        {open
          ? <ChevronUp  className="w-3 h-3 ml-1" />
          : <ChevronDown className="w-3 h-3 ml-1" />
        }
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {/* Status selector */}
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500 w-14 flex-shrink-0">Status</p>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 text-xs w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="fixed">Fixed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reply text */}
          <Textarea
            placeholder="Write your reply to the student..."
            value={reply}
            onChange={e => setReply(e.target.value)}
            rows={3}
            className="resize-none text-sm"
            maxLength={2000}
          />
          <p className="text-xs text-gray-400 text-right -mt-1">
            {reply.length}/2000
          </p>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                : <Send className="w-3.5 h-3.5 mr-1" />
              }
              Save Reply
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Feedback Card ──────────────────────────────────────────────────────────

function FeedbackCard({
  item,
  onUpdated,
}: {
  item:      FeedbackItem
  onUpdated: (id: string, reply: string, status: string) => void
}) {
  return (
    <Card className={item.adminReply ? 'border-green-200' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {item.exam.title}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {item.user.name || item.user.email} · {formatDate(item.createdAt)}
            </p>
          </div>
          <StatusBadge status={item.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">

        {/* Ratings */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-400 mb-1">Difficulty</p>
            <StarDisplay value={item.difficultyRating} />
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-400 mb-1">Experience</p>
            <StarDisplay value={item.experienceRating} />
          </div>
        </div>

        {/* Student comment */}
        {item.comments && (
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-400 mb-1">Student Comment</p>
            <p className="text-sm text-gray-700">{item.comments}</p>
          </div>
        )}

        {/* Existing admin reply */}
        {item.adminReply && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <p className="text-xs font-semibold text-green-800 mb-1">
              Your Reply
            </p>
            <p className="text-sm text-green-700">{item.adminReply}</p>
            {item.repliedAt && (
              <p className="text-xs text-green-400 mt-1">
                {formatDate(item.repliedAt)}
              </p>
            )}
          </div>
        )}

        {/* Reply box */}
        <ReplyBox
          itemId={item.id}
          type="feedback"
          currentReply={item.adminReply}
          currentStatus={item.status}
          onSaved={(reply, status) => onUpdated(item.id, reply, status)}
        />
      </CardContent>
    </Card>
  )
}

// ── Error Report Card ──────────────────────────────────────────────────────

function ErrorReportCard({
  item,
  onUpdated,
}: {
  item:      ErrorReportItem
  onUpdated: (id: string, reply: string, status: string) => void
}) {
  return (
    <Card className={item.adminReply ? 'border-green-200' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {item.exam.title}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {item.user.name || item.user.email} · Q{item.questionNumber} ·{' '}
              {ISSUE_TYPE_LABELS[item.issueType] || item.issueType} ·{' '}
              {formatDate(item.createdAt)}
            </p>
          </div>
          <StatusBadge status={item.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">

        {/* Question preview */}
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          <p className="text-xs text-amber-600 font-medium mb-1">
            Reported Question (Q{item.questionNumber})
          </p>
          <p className="text-xs text-gray-700">
            {plainText(item.question.statement)}
          </p>
        </div>

        {/* Student description */}
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-400 mb-1">Student's Description</p>
          <p className="text-sm text-gray-700">{item.description}</p>
        </div>

        {/* Existing admin reply */}
        {item.adminReply && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <p className="text-xs font-semibold text-green-800 mb-1">
              Your Reply
            </p>
            <p className="text-sm text-green-700">{item.adminReply}</p>
            {item.repliedAt && (
              <p className="text-xs text-green-400 mt-1">
                {formatDate(item.repliedAt)}
              </p>
            )}
          </div>
        )}

        {/* Reply box */}
        <ReplyBox
          itemId={item.id}
          type="error"
          currentReply={item.adminReply}
          currentStatus={item.status}
          onSaved={(reply, status) => onUpdated(item.id, reply, status)}
        />
      </CardContent>
    </Card>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AdminFeedbackPage() {
  const [feedbacks,    setFeedbacks]    = useState<FeedbackItem[]>([])
  const [errorReports, setErrorReports] = useState<ErrorReportItem[]>([])
  const [meta,         setMeta]         = useState<Meta | null>(null)
  const [isLoading,    setIsLoading]    = useState(true)
  const [error,        setError]        = useState<string | null>(null)

  // filters — separate per tab so switching tabs doesn't carry over filter
  const [activeTab,          setActiveTab]          = useState('feedback')
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState('all')
  const [errorStatusFilter,    setErrorStatusFilter]    = useState('all')

  // current filter based on active tab
  const statusFilter = activeTab === 'feedback'
    ? feedbackStatusFilter
    : errorStatusFilter

  const setStatusFilter = (val: string) => {
    if (activeTab === 'feedback') setFeedbackStatusFilter(val)
    else setErrorStatusFilter(val)
  }

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        type:   activeTab, // now matches exactly: 'feedback' | 'error'
        status: statusFilter,
      })

      const res = await fetch(`/api/admin/feedback?${params}`)
      if (!res.ok) throw new Error('Failed to fetch feedback')

      const data = await res.json()
      setFeedbacks(data.feedbacks    || [])
      setErrorReports(data.errorReports || [])
      setMeta(data.meta)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  // optimistic update after admin replies
  const handleFeedbackUpdated = (
    id: string, reply: string, status: string
  ) => {
    setFeedbacks(prev => prev.map(f =>
      f.id === id
        ? { ...f, adminReply: reply, status, repliedAt: new Date().toISOString() }
        : f
    ))
  }

  const handleErrorUpdated = (
    id: string, reply: string, status: string
  ) => {
    setErrorReports(prev => prev.map(r =>
      r.id === id
        ? { ...r, adminReply: reply, status, repliedAt: new Date().toISOString() }
        : r
    ))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
        <Button onClick={fetchData} variant="outline" className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Feedback & Reports
          </h1>
          <p className="mt-1 text-gray-500 text-sm">
            Review student feedback and error reports. Reply to notify students.
          </p>
        </div>
      </div>

      {/* ── Stats ── */}
      {meta && (
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              label: 'Pending Feedback',
              value: meta.pendingFeedbackCount,
              icon:  MessageSquare,
              bg:    'bg-yellow-100 text-yellow-600',
            },
            {
              label: 'Pending Error Reports',
              value: meta.pendingErrorCount,
              icon:  AlertTriangle,
              bg:    'bg-red-100 text-red-600',
            },
            {
              label: 'Total Pending',
              value: meta.totalPending,
              icon:  Clock,
              bg:    'bg-orange-100 text-orange-600',
            },
          ].map(({ label, value, icon: Icon, bg }) => (
            <Card key={label}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${bg}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <p className="text-sm text-gray-500">Filter by status:</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-xs w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="fixed">Fixed</SelectItem>
          </SelectContent>
        </Select>
        {statusFilter !== 'all' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-gray-400"
            onClick={() => setStatusFilter('all')}
          >
            Clear filter
          </Button>
        )}
      </div>

      {/* ── Tabs ── */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="feedback" className="gap-2">
            <MessageSquare className="w-3.5 h-3.5" />
            Feedback
            {meta && meta.pendingFeedbackCount > 0 && (
              <span className="ml-1 bg-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {meta.pendingFeedbackCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="error" className="gap-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            Error Reports
            {meta && meta.pendingErrorCount > 0 && (
              <span className="ml-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {meta.pendingErrorCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-3">
          {feedbacks.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <MessageSquare className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-500">
                  No feedback found
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {statusFilter !== 'all'
                    ? 'Try clearing the status filter'
                    : 'Students haven\'t submitted any feedback yet'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            feedbacks.map(item => (
              <FeedbackCard
                key={item.id}
                item={item}
                onUpdated={handleFeedbackUpdated}
              />
            ))
          )}
        </TabsContent>

        {/* Error Reports Tab */}
        <TabsContent value="error" className="space-y-3">
          {errorReports.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <AlertTriangle className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-500">
                  No error reports found
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {statusFilter !== 'all'
                    ? 'Try clearing the status filter'
                    : 'Students haven\'t reported any errors yet'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            errorReports.map(item => (
              <ErrorReportCard
                key={item.id}
                item={item}
                onUpdated={handleErrorUpdated}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}