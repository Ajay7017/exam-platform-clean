// src/app/(student)/feedback/page.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  MessageSquare, AlertTriangle, CheckCircle,
  Clock, ChevronRight, Star, Inbox,
} from 'lucide-react'

// ── helpers ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    cls:   'bg-yellow-100 text-yellow-700',
    icon:  Clock,
  },
  acknowledged: {
    label: 'Acknowledged',
    cls:   'bg-blue-100 text-blue-700',
    icon:  CheckCircle,
  },
  fixed: {
    label: 'Fixed',
    cls:   'bg-green-100 text-green-700',
    icon:  CheckCircle,
  },
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
  const Icon = cfg.icon
  return (
    <Badge className={`${cfg.cls} flex items-center gap-1 text-xs`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  )
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

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  })
}

// strip html for question preview
function plainText(html: string) {
  return html.replace(/<[^>]*>/g, '').slice(0, 120)
    + (html.length > 120 ? '...' : '')
}

// ── page ───────────────────────────────────────────────────────────────────

export default async function FeedbackPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const [feedbacks, errorReports] = await Promise.all([
    prisma.examFeedback.findMany({
      where:   { userId: session.user.id },
      include: { exam: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.errorReport.findMany({
      where:   { userId: session.user.id },
      include: {
        exam:     { select: { id: true, title: true } },
        question: { select: { id: true, statement: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const totalSubmissions  = feedbacks.length + errorReports.length
  const pendingReplies    = [
    ...feedbacks,
    ...errorReports,
  ].filter(f => f.status === 'pending').length
  const repliedCount = [
    ...feedbacks,
    ...errorReports,
  ].filter(f => f.adminReply).length

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Feedback & Reports</h1>
        <p className="mt-1 text-gray-500 text-sm">
          Track your submitted feedback and error reports. Admin replies appear here.
        </p>
      </div>

      {/* ── Stats row ── */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Total Submissions',
            value: totalSubmissions,
            icon:  MessageSquare,
            bg:    'bg-blue-100 text-blue-600',
          },
          {
            label: 'Awaiting Reply',
            value: pendingReplies,
            icon:  Clock,
            bg:    'bg-yellow-100 text-yellow-600',
          },
          {
            label: 'Replied',
            value: repliedCount,
            icon:  CheckCircle,
            bg:    'bg-green-100 text-green-600',
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

      {/* ── Empty state ── */}
      {totalSubmissions === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Inbox className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              No submissions yet
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              After completing an exam, use the Feedback or Report Error tabs
              in your results to share your thoughts.
            </p>
            <Button asChild>
              <Link href="/results">View My Results</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Feedback submissions ── */}
      {feedbacks.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-400" />
            Exam Feedback
            <span className="text-xs font-normal text-gray-400">
              ({feedbacks.length})
            </span>
          </h2>

          {feedbacks.map(fb => (
            <Card key={fb.id} className={
              fb.adminReply
                ? 'border-blue-200 bg-blue-50/30'
                : ''
            }>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate text-sm">
                      {fb.exam.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Submitted {formatDate(fb.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={fb.status} />
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                {/* Ratings */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg border px-3 py-2">
                    <p className="text-xs text-gray-400 mb-1">Paper Difficulty</p>
                    <StarDisplay value={fb.difficultyRating} />
                  </div>
                  <div className="bg-white rounded-lg border px-3 py-2">
                    <p className="text-xs text-gray-400 mb-1">Experience</p>
                    <StarDisplay value={fb.experienceRating} />
                  </div>
                </div>

                {/* Student comment */}
                {fb.comments && (
                  <div className="bg-white rounded-lg border px-3 py-2">
                    <p className="text-xs text-gray-400 mb-1">Your Comment</p>
                    <p className="text-sm text-gray-700">{fb.comments}</p>
                  </div>
                )}

                {/* Admin reply */}
                {fb.adminReply && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold">A</span>
                      </div>
                      <p className="text-xs font-semibold text-blue-800">
                        Admin Reply
                      </p>
                      {fb.repliedAt && (
                        <p className="text-xs text-blue-400 ml-auto">
                          {formatDate(fb.repliedAt)}
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-blue-700">{fb.adminReply}</p>
                  </div>
                )}

                {/* No reply yet */}
                {!fb.adminReply && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Awaiting admin reply — usually within 24 hours
                  </p>
                )}

                {/* Link to result */}
                <div className="pt-1">
                  <Link
                    href={`/results/${fb.attemptId}`}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View exam result
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {/* ── Error reports ── */}
      {errorReports.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Error Reports
            <span className="text-xs font-normal text-gray-400">
              ({errorReports.length})
            </span>
          </h2>

          {errorReports.map(report => (
            <Card key={report.id} className={
              report.adminReply
                ? 'border-blue-200 bg-blue-50/30'
                : ''
            }>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {report.exam.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Q{report.questionNumber} ·{' '}
                      {ISSUE_TYPE_LABELS[report.issueType] || report.issueType} ·{' '}
                      {formatDate(report.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={report.status} />
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">

                {/* Question preview */}
                <div className="bg-gray-50 rounded-lg border px-3 py-2">
                  <p className="text-xs text-gray-400 mb-1">
                    Question {report.questionNumber}
                  </p>
                  <p className="text-xs text-gray-600">
                    {plainText(report.question.statement)}
                  </p>
                </div>

                {/* Student description */}
                <div className="bg-white rounded-lg border px-3 py-2">
                  <p className="text-xs text-gray-400 mb-1">Your Report</p>
                  <p className="text-sm text-gray-700">{report.description}</p>
                </div>

                {/* Admin reply */}
                {report.adminReply && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold">A</span>
                      </div>
                      <p className="text-xs font-semibold text-blue-800">
                        Admin Reply
                      </p>
                      {report.repliedAt && (
                        <p className="text-xs text-blue-400 ml-auto">
                          {formatDate(report.repliedAt)}
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-blue-700">{report.adminReply}</p>
                  </div>
                )}

                {/* No reply yet */}
                {!report.adminReply && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Awaiting admin reply — usually within 24 hours
                  </p>
                )}

                {/* Link to result */}
                <div className="pt-1">
                  <Link
                    href={`/results/${report.attemptId}`}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View exam result
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

    </div>
  )
}