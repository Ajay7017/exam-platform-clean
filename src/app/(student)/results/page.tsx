// src/app/(student)/results/page.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Clock, Trophy, Target, TrendingUp,
  Eye, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, MinusCircle,
} from 'lucide-react'

const PER_PAGE = 10

// ── helpers ────────────────────────────────────────────────────────────────

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

function getSubjectGradient(title: string) {
  let hash = 0
  for (let i = 0; i < title.length; i++)
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  return SUBJECT_GRADIENTS[Math.abs(hash) % SUBJECT_GRADIENTS.length]
}

function getSubjectInitial(title: string) {
  return title?.trim()?.[0]?.toUpperCase() || '?'
}

function getScoreColor(pct: number) {
  if (pct >= 75) return 'bg-green-100 text-green-700'
  if (pct >= 50) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

// ── page ───────────────────────────────────────────────────────────────────

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const page    = Math.max(1, parseInt(searchParams.page || '1'))
  const skip    = (page - 1) * PER_PAGE

  // total count for pagination
  const totalCount = await prisma.attempt.count({
    where: { userId: session.user.id, status: 'graded'},
  })

  // paginated attempts
  const attempts = await prisma.attempt.findMany({
    where:   { userId: session.user.id, status: 'graded' },
    include: { exam: { select: { title: true, totalMarks: true } } },
    orderBy: { submittedAt: 'desc' },
    skip,
    take: PER_PAGE,
  })

  // stats (all-time, not paginated)
  const allAttempts = await prisma.attempt.findMany({
    where:  { userId: session.user.id, status: 'graded' },
    select: { percentage: true, timeSpentSec: true },
  })

  const totalExams  = totalCount
  const avgScore    = totalExams > 0
    ? allAttempts.reduce((s, a) => s + (Number(a.percentage) || 0), 0) / totalExams
    : 0
  const totalHours  = (
    allAttempts.reduce((s, a) => s + (a.timeSpentSec || 0), 0) / 3600
  ).toFixed(1)

  // global rank
  const allUserScores = await prisma.leaderboardEntry.groupBy({
    by: ['userId'],
    _sum: { score: true },
  })
  const sortedScores  = allUserScores
    .map(u => ({ userId: u.userId, total: u._sum.score || 0 }))
    .sort((a, b) => b.total - a.total)
  const rankIndex  = sortedScores.findIndex(u => u.userId === session.user.id)
  const globalRank = rankIndex >= 0 ? rankIndex + 1 : null

  const totalPages = Math.ceil(totalCount / PER_PAGE)

  // ── render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Results</h1>
        <p className="mt-1 text-gray-500 text-sm">
          View your performance history and track your progress
        </p>
      </div>

      {/* Stats row */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Exams',  value: totalExams,                   icon: Trophy,    bg: 'bg-blue-100 text-blue-600' },
          { label: 'Avg Score',    value: `${avgScore.toFixed(1)}%`,    icon: Target,    bg: 'bg-green-100 text-green-600' },
          { label: 'Global Rank',  value: globalRank ? `#${globalRank}` : 'N/A', icon: TrendingUp, bg: 'bg-yellow-100 text-yellow-600' },
          { label: 'Time Spent',   value: `${totalHours}h`,             icon: Clock,     bg: 'bg-purple-100 text-purple-600' },
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

      {/* Empty state */}
      {totalExams === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Trophy className="w-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No results yet</h3>
            <p className="text-sm text-gray-500 mb-6">
              Take your first exam to see your results here
            </p>
            <Button asChild>
              <Link href="/exams">Browse Exams</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results list */}
      {attempts.length > 0 && (
        <div className="space-y-3">
          {attempts.map(attempt => {
            const pct      = Number(attempt.percentage) || 0
            const accuracy = attempt.totalQuestions > 0
              ? ((attempt.correctAnswers || 0) / attempt.totalQuestions) * 100
              : 0
            const gradient = getSubjectGradient(attempt.exam.title)
            const initial  = getSubjectInitial(attempt.exam.title)
            const dateStr  = attempt.submittedAt
              ? new Date(attempt.submittedAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })
              : '—'

            return (
              <Card key={attempt.id} className="hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex">

                    {/* Gradient side strip */}
                    <div className={`w-16 bg-gradient-to-b ${gradient} flex-shrink-0 flex flex-col items-center justify-center gap-1 py-4`}>
                      <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{initial}</span>
                      </div>
                    </div>

                    {/* Main content */}
                    <div className="flex-1 px-4 py-3 flex flex-col gap-2">

                      {/* Top row: title + score badge + action */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {attempt.exam.title}
                          </h3>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Completed {dateStr}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`text-sm px-2.5 py-0.5 ${getScoreColor(pct)}`}>
                            {pct.toFixed(1)}%
                          </Badge>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/results/${attempt.id}`}>
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Details
                            </Link>
                          </Button>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        {[
                          { label: 'Score',      value: `${attempt.score?.toFixed(0) || 0}/${attempt.exam.totalMarks}` },
                          { label: 'Rank',       value: attempt.rank ? `#${attempt.rank}` : 'N/A' },
                          { label: 'Percentile', value: attempt.percentile ? `${Number(attempt.percentile).toFixed(1)}%` : 'N/A' },
                          { label: 'Accuracy',   value: `${accuracy.toFixed(1)}%` },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-gray-50 rounded-lg px-2 py-1.5">
                            <p className="text-gray-400 text-[10px] leading-tight">{label}</p>
                            <p className="font-semibold text-gray-900">{value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Correct / Wrong / Unattempted */}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          {attempt.correctAnswers || 0} Correct
                        </span>
                        <span className="flex items-center gap-1">
                          <XCircle className="h-3.5 w-3.5 text-red-500" />
                          {attempt.wrongAnswers || 0} Wrong
                        </span>
                        <span className="flex items-center gap-1">
                          <MinusCircle className="h-3.5 w-3.5 text-gray-400" />
                          {attempt.unattempted || 0} Skipped
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">
            Showing {skip + 1}–{Math.min(skip + PER_PAGE, totalCount)} of {totalCount} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              disabled={page <= 1}
            >
              <Link href={`/results?page=${page - 1}`}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Link>
            </Button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, idx) =>
                  p === '...'
                    ? <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 text-sm">…</span>
                    : (
                      <Button
                        key={p}
                        variant={p === page ? 'default' : 'outline'}
                        size="sm"
                        className="w-8 h-8 p-0"
                        asChild={p !== page}
                      >
                        {p === page
                          ? <span>{p}</span>
                          : <Link href={`/results?page=${p}`}>{p}</Link>
                        }
                      </Button>
                    )
                )
              }
            </div>

            <Button
              variant="outline"
              size="sm"
              asChild
              disabled={page >= totalPages}
            >
              <Link href={`/results?page=${page + 1}`}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}