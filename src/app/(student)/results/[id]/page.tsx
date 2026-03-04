// src/app/(student)/results/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SafeHtml } from '@/lib/utils/safe-html';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaderboardCard } from '@/components/student/LeaderboardCard';
import { OptimizedImage } from '@/components/ui/optimized-image';
import {
  RefreshCw, CheckCircle, XCircle, Circle,
  Clock, Trophy, TrendingUp, AlertCircle,
  ArrowLeft, Target, MinusCircle,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
} from 'recharts';

const COLORS = {
  correct:     '#10b981',
  wrong:       '#ef4444',
  unattempted: '#6b7280',
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

function formatTime(seconds: number) {
  const hrs  = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m ${secs}s`
}

function getPerformanceLabel(pct: number) {
  if (pct >= 80) return { label: 'Excellent', cls: 'bg-green-100 text-green-700' }
  if (pct >= 60) return { label: 'Good',      cls: 'bg-blue-100 text-blue-700' }
  if (pct >= 40) return { label: 'Average',   cls: 'bg-yellow-100 text-yellow-700' }
  return            { label: 'Needs Work',  cls: 'bg-red-100 text-red-700' }
}

// ── page ───────────────────────────────────────────────────────────────────

export default function ResultPage() {
  const params    = useParams()
  const router    = useRouter()
  const attemptId = params.id as string

  const [result, setResult]   = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => { fetchResult() }, [attemptId])

  const fetchResult = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/attempts/${attemptId}/result`)
      if (!res.ok) throw new Error('Failed to load results')
      setResult(await res.json())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <RefreshCw className="w-7 h-7 animate-spin mx-auto text-primary" />
          <p className="text-sm text-gray-500">Loading results...</p>
        </div>
      </div>
    )
  }

  if (error || !result) {
    return (
      <Card className="border-red-200 max-w-lg mx-auto mt-10">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle className="w-5 h-5" />
            <p>{error || 'Results not found'}</p>
          </div>
          <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    )
  }

  const pieData = [
    { name: 'Correct',     value: result.correctAnswers },
    { name: 'Wrong',       value: result.wrongAnswers },
    { name: 'Unattempted', value: result.unattempted },
  ]

  const pct       = result.percentage || 0
  const perf      = getPerformanceLabel(pct)
  const gradient  = getSubjectGradient(result.examTitle || '')
  const initial   = getSubjectInitial(result.examTitle || '')
  const accuracy  = result.totalQuestions > 0
    ? ((result.correctAnswers / result.totalQuestions) * 100).toFixed(1)
    : '0'

  return (
    <div className="max-w-4xl mx-auto space-y-5 -mt-2">

      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/results')}
        className="-ml-2 h-8 text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Results
      </Button>

      {/* ── Score Header Card ── */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">

            {/* Gradient panel */}
            <div className={`relative bg-gradient-to-br ${gradient} sm:w-48 h-40 sm:h-auto flex-shrink-0 flex flex-col items-center justify-center gap-2`}>
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                  backgroundSize: '18px 18px',
                }}
              />
              <div className="relative w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{initial}</span>
              </div>
              {/* big score */}
              <div className="relative text-center">
                <p className="text-3xl font-bold text-white leading-none">
                  {pct.toFixed(1)}%
                </p>
                <p className="text-white/70 text-xs mt-1">Score</p>
              </div>
            </div>

            {/* Right info */}
            <div className="flex-1 p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-xl font-bold text-gray-900">{result.examTitle}</h1>
                  <Badge className={perf.cls}>{perf.label}</Badge>
                  <Badge className={pct >= (result.passingMarks || 40)
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                  }>
                    {pct >= (result.passingMarks || 40) ? 'Passed' : 'Failed'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-400">
                  {new Date(result.submittedAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>

              {/* raw score */}
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900">
                  {result.score?.toFixed(0) || 0}
                </span>
                <span className="text-lg text-gray-400">/ {result.totalMarks}</span>
                <span className="text-sm text-gray-400 ml-2">marks</span>
              </div>

              {/* meta tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { icon: Clock,      label: 'Time',       value: formatTime(result.timeSpent) },
                  { icon: Trophy,     label: 'Rank',       value: result.rank ? `#${result.rank} / ${result.totalAttempts}` : 'N/A' },
                  { icon: TrendingUp, label: 'Percentile', value: result.percentile ? `${Number(result.percentile).toFixed(1)}%` : 'N/A' },
                  { icon: Target,     label: 'Accuracy',   value: `${accuracy}%` },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-1 mb-0.5">
                      <Icon className="h-3 w-3 text-gray-400" />
                      <p className="text-[10px] text-gray-400">{label}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Answer summary strip ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: CheckCircle,  label: 'Correct',     value: result.correctAnswers, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
          { icon: XCircle,      label: 'Wrong',       value: result.wrongAnswers,   color: 'text-red-500',   bg: 'bg-red-50 border-red-200' },
          { icon: MinusCircle,  label: 'Unattempted', value: result.unattempted,    color: 'text-gray-500',  bg: 'bg-gray-50 border-gray-200' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${bg}`}>
            <Icon className={`h-5 w-5 ${color} flex-shrink-0`} />
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="solutions">Solutions</TabsTrigger>
        </TabsList>

        {/* Summary */}
        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Answer Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={90}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={
                            entry.name === 'Correct'     ? COLORS.correct
                            : entry.name === 'Wrong'     ? COLORS.wrong
                            : COLORS.unattempted
                          }
                        />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Topic-wise Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.topicWisePerformance?.length > 0
                    ? result.topicWisePerformance.map((topic: any) => (
                        <div key={topic.topic}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-gray-700 truncate">{topic.topic}</span>
                            <span className="text-gray-400 flex-shrink-0 ml-2">
                              {topic.correct}/{topic.total} ({topic.accuracy.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                topic.accuracy >= 75 ? 'bg-green-500'
                                : topic.accuracy >= 50 ? 'bg-yellow-500'
                                : 'bg-red-500'
                              }`}
                              style={{ width: `${topic.accuracy}%` }}
                            />
                          </div>
                        </div>
                      ))
                    : <p className="text-sm text-gray-400 text-center py-8">No topic data available</p>
                  }
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Leaderboard */}
        <TabsContent value="leaderboard">
          <LeaderboardCard type="exam" examId={result.examId} limit={25} showTitle={true} />
        </TabsContent>

        {/* Solutions */}
        <TabsContent value="solutions" className="space-y-3">
          {result.questionResults?.map((q: any, index: number) => (
            <Card
              key={q.questionId}
              className={`border-l-4 ${
                q.isCorrect            ? 'border-l-green-500'
                : q.yourAnswer         ? 'border-l-red-500'
                : 'border-l-gray-300'
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-500">Q{index + 1}</span>
                  {q.questionType === 'numerical' && (
                    <Badge variant="outline" className="text-blue-600 text-xs">NAT</Badge>
                  )}
                  {q.isCorrect
                    ? <CheckCircle className="w-4 h-4 text-green-500" />
                    : q.yourAnswer
                    ? <XCircle className="w-4 h-4 text-red-500" />
                    : <Circle className="w-4 h-4 text-gray-400" />
                  }
                  <span className="text-xs text-gray-400 ml-auto">
                    {q.isCorrect ? `+${q.marksAwarded}` : q.yourAnswer ? `${q.marksAwarded}` : '0'} marks
                  </span>
                </div>

                <div className="mt-2 text-sm leading-relaxed space-y-3">
                  <SafeHtml html={q.statement} />
                  {q.imageUrl && (
                    <div className="mt-2">
                      <OptimizedImage
                        src={q.imageUrl}
                        alt={`Question ${index + 1}`}
                        className="max-w-full rounded-lg border shadow-sm"
                      />
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                {/* MCQ options */}
                {q.questionType === 'mcq' && (
                  <div className="space-y-1.5">
                    {q.options?.map((opt: any) => (
                      <div
                        key={opt.key}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm ${
                          opt.isCorrect
                            ? 'border-green-400 bg-green-50'
                            : opt.key === q.yourAnswer && !q.isCorrect
                            ? 'border-red-400 bg-red-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <span className="font-semibold text-gray-500 w-4">{opt.key}.</span>
                        <SafeHtml html={opt.text} className="flex-1" />
                        {opt.isCorrect && <CheckCircle className="w-4 h-4 text-green-600 ml-auto flex-shrink-0" />}
                        {opt.key === q.yourAnswer && !q.isCorrect && (
                          <XCircle className="w-4 h-4 text-red-500 ml-auto flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* NAT answer */}
                {q.questionType === 'numerical' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-lg border-2 ${
                      q.yourAnswer
                        ? q.isCorrect ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}>
                      <p className="text-xs text-gray-500 mb-1">Your Answer</p>
                      <p className={`text-xl font-bold ${
                        q.yourAnswer
                          ? q.isCorrect ? 'text-green-700' : 'text-red-700'
                          : 'text-gray-400'
                      }`}>
                        {q.yourAnswer || 'Not Attempted'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg border-2 border-green-400 bg-green-50">
                      <p className="text-xs text-gray-500 mb-1">Correct Answer</p>
                      <p className="text-xl font-bold text-green-700">{q.correctAnswer}</p>
                    </div>
                  </div>
                )}

                {/* MCQ answer summary */}
                {q.questionType === 'mcq' && (
                  <div className="flex gap-4 text-xs text-gray-500 pt-1 border-t">
                    <span><strong>Your:</strong> {q.yourAnswer || 'Not Attempted'}</span>
                    <span><strong>Correct:</strong> {q.correctAnswer}</span>
                  </div>
                )}

                {/* Explanation */}
                {q.explanation && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs font-semibold text-blue-800 mb-1">Explanation</p>
                    <div className="text-xs text-blue-700">
                      <SafeHtml html={q.explanation} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}