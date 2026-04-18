// src/app/(student)/dashboard/page.tsx
'use client';

import { useSearchParams } from 'next/navigation'
import { ResultsProcessingBanner } from '@/components/student/ResultsProcessingBanner';
import { WelcomeModal } from '@/components/student/WelcomeModal';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatsCardSkeleton } from '@/components/student/StatsCardSkeleton';
import { SubjectLeaderboardTabs } from '@/components/student/SubjectLeaderboardTabs';

import {
  BookOpen, Trophy, Award, Clock,
  TrendingUp, TrendingDown, ChevronRight,
  BarChart2, Play, Package, Infinity, ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// ── Types ──────────────────────────────────────────────────────────────────

interface DashboardData {
  stats: {
    examsTaken:   { total: number; thisWeek: number };
    averageScore: { current: number; change: string };
    rank:         { current: number | null; totalParticipants: number };
    timeSpent:    { totalHours: number; thisWeekHours: number };
  };
  continueExams: Array<{
    attemptId: string;
    examId: string;
    examTitle: string;
    examSlug: string;
    totalQuestions: number;
    answeredCount: number;
    progressPercentage: number;
    startedAt: string;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    examTitle: string;
    examSlug: string;
    score: string;
    submittedAt: string | null;
  }>;
}

// Minimal shape we need from the purchases API — only bundle purchases
interface BundleExamItem {
  id: string
  title: string
  slug: string
  subject: string
  duration: number
  totalQuestions: number
  difficulty: string
}

interface BundlePurchase {
  id: string
  purchasedAt: string
  bundle: {
    id: string
    name: string
    slug: string
    description: string | null
    totalExams: number
    exams: BundleExamItem[]
  }
}

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

function getTimeAgo(dateString: string | null) {
  if (!dateString) return 'Recently'
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  } catch {
    return 'Recently'
  }
}

function parseScoreValue(scoreStr: string): number | null {
  const match = scoreStr.match(/\((\d+(?:\.\d+)?)%\)/)
  if (match) return parseFloat(match[1])
  return null
}

function ScoreColor(score: string) {
  const pct = parseScoreValue(score)
  if (pct === null) return 'text-gray-700'
  if (pct >= 75)   return 'text-green-600'
  if (pct >= 50)   return 'text-yellow-600'
  return 'text-red-500'
}

// ── Bundle Access Section ──────────────────────────────────────────────────
// Fetches from /api/student/purchases (built in Phase 5) and renders
// a compact card per bundle. Silently hidden if student has no bundles.

function BundleAccessSection() {
  const router = useRouter()
  const [bundles, setBundles] = useState<BundlePurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/student/purchases')
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setBundles(data.bundlePurchases ?? []))
      .catch(() => {/* silently fail — dashboard must not break */})
      .finally(() => setLoading(false))
  }, [])

  // Don't render anything while loading or if student has no bundles
  if (loading || bundles.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-violet-500" />
            My Bundle Access
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-gray-400 h-7" asChild>
            <Link href="/purchases?tab=bundles">
              View all <ExternalLink className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
        <p className="text-xs text-gray-400">
          {bundles.length} bundle{bundles.length !== 1 ? 's' : ''} — lifetime access
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {bundles.map((purchase) => {
          const isExpanded = expandedId === purchase.id
          return (
            <div
              key={purchase.id}
              className="rounded-xl border border-gray-100 overflow-hidden"
            >
              {/* Bundle header row */}
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-violet-50 to-purple-50">
                {/* Icon */}
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center flex-shrink-0 relative">
                  <Package className="h-4 w-4 text-white" />
                  <span className="absolute -top-1 -right-1 bg-white border border-purple-200 text-purple-700 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {purchase.bundle.totalExams}
                  </span>
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {purchase.bundle.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">
                      {purchase.bundle.totalExams} exams
                    </span>
                    <span className="text-xs text-violet-600 flex items-center gap-0.5">
                      <Infinity className="h-3 w-3" /> Lifetime
                    </span>
                  </div>
                </div>

                {/* Expand toggle */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : purchase.id)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 flex-shrink-0"
                >
                  {isExpanded ? 'Hide' : 'Exams'}
                  <ChevronRight
                    className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>
              </div>

              {/* Included exams — collapsible */}
              {isExpanded && (
                <div className="divide-y divide-gray-50 bg-white">
                  {purchase.bundle.exams.map((exam) => {
                    const gradient = getSubjectGradient(exam.subject)
                    const initial  = getSubjectInitial(exam.subject)
                    return (
                      <div
                        key={exam.id}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors group"
                      >
                        {/* Subject avatar */}
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-white font-bold text-xs">{initial}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {exam.title}
                          </p>
                          <p className="text-xs text-gray-400">
                            {exam.subject} · {exam.duration}m · {exam.totalQuestions} Qs
                          </p>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => router.push(`/exam/${exam.slug}/start`)}
                        >
                          Start
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function StudentDashboard() {
  const searchParams        = useSearchParams()
  const processingAttemptId = searchParams.get('processing')
  const router              = useRouter()
  const { data: session }   = useSession()
  const [data, setData]     = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => { fetchDashboardData() }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/student/dashboard')
      if (!response.ok) throw new Error('Failed to load dashboard data')
      setData(await response.json())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200">
          <CardContent className="p-6 text-red-600">{error}</CardContent>
        </Card>
      </div>
    )
  }

  // ── stat card definitions ─────────────────────────────────────────────
  const statCards = data ? [
    {
      title: 'Exams Taken',
      value: data.stats.examsTaken.total.toString(),
      icon: BookOpen,
      iconBg: 'bg-blue-100 text-blue-600',
      change: `+${data.stats.examsTaken.thisWeek} this week`,
      changeType: 'positive' as const,
    },
    {
      title: 'Average Score',
      value: `${data.stats.averageScore.current}%`,
      icon: BarChart2,
      iconBg: 'bg-purple-100 text-purple-600',
      change: `${parseFloat(data.stats.averageScore.change) >= 0 ? '+' : ''}${data.stats.averageScore.change}% vs last week`,
      changeType: parseFloat(data.stats.averageScore.change) >= 0 ? 'positive' as const : 'negative' as const,
    },
    {
      title: 'Current Rank',
      value: data.stats.rank.current ? `#${data.stats.rank.current}` : 'N/A',
      icon: Trophy,
      iconBg: 'bg-yellow-100 text-yellow-600',
      change: `Out of ${data.stats.rank.totalParticipants} students`,
      changeType: 'neutral' as const,
    },
    {
      title: 'Time Spent',
      value: `${data.stats.timeSpent.totalHours}h`,
      icon: Clock,
      iconBg: 'bg-green-100 text-green-600',
      change: `${data.stats.timeSpent.thisWeekHours}h this week`,
      changeType: 'neutral' as const,
    },
  ] : []

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Welcome modal — shows only on first visit */}
      {session?.user && (
        <WelcomeModal
          userName={session.user.name || 'Student'}
          userId={session.user.id}
        />
      )}

      {/* Processing banner */}
      {processingAttemptId && (
        <ResultsProcessingBanner attemptId={processingAttemptId} />
      )}

      {/* ── Welcome ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {session?.user?.name?.split(' ')[0] || 'Student'}! 👋
          </h1>
          <p className="mt-1 text-gray-500 text-sm">
            Here's your learning progress overview
          </p>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatsCardSkeleton key={i} />)
          : statCards.map((stat, index) => (
              <Card
                key={stat.title}
                className="animate-scale-in"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full ${stat.iconBg}`}>
                      <stat.icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className={`text-xs flex items-center gap-1 mt-1.5 ${
                    stat.changeType === 'positive' ? 'text-green-600'
                    : stat.changeType === 'negative' ? 'text-red-500'
                    : 'text-gray-400'
                  }`}>
                    {stat.changeType === 'positive' && <TrendingUp className="h-3 w-3" />}
                    {stat.changeType === 'negative' && <TrendingDown className="h-3 w-3" />}
                    {stat.change}
                  </p>
                </CardContent>
              </Card>
            ))
        }
      </div>

      {/* ── Continue Learning (only if in-progress exams exist) ── */}
      {!isLoading && data && data.continueExams.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Play className="h-4 w-4 text-primary" />
              Continue Where You Left Off
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.continueExams.map(exam => {
              const gradient = getSubjectGradient(exam.examTitle)
              const initial  = getSubjectInitial(exam.examTitle)
              return (
                <div
                  key={exam.attemptId}
                  className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group"
                  onClick={() => router.push(`/exam/take/${exam.attemptId}`)}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white font-bold text-sm">{initial}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{exam.examTitle}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {exam.answeredCount} of {exam.totalQuestions} questions answered
                    </p>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1.5">
                      <div
                        className="h-1.5 bg-primary rounded-full transition-all"
                        style={{ width: `${exam.progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      {exam.progressPercentage}%
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* ── Bundle Access (only renders if student has purchased bundles) ── */}
      <BundleAccessSection />

      {/* ── Recent Activity ── */}
      {!isLoading && data && data.recentActivity.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-gray-100">
            {data.recentActivity.map((activity) => {
              const gradient = getSubjectGradient(activity.examTitle)
              const initial  = getSubjectInitial(activity.examTitle)
              const scoreColor = ScoreColor(activity.score)
              return (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 py-3 first:pt-0 last:pb-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors cursor-pointer group"
                  onClick={() => router.push(`/results/${activity.id}`)}
                >
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white font-bold text-xs">{initial}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.examTitle}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {getTimeAgo(activity.submittedAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-sm font-semibold ${scoreColor}`}>
                      {activity.score}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* ── Leaderboard (bottom — secondary info) ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Leaderboard Rankings
          </CardTitle>
          <p className="text-xs text-gray-400">
            See where you stand among other students
          </p>
        </CardHeader>
        <CardContent>
          <SubjectLeaderboardTabs />
        </CardContent>
      </Card>

    </div>
  )
}