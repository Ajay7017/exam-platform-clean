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
import { FeedbackTab }    from '@/components/results/FeedbackTab'
import { ErrorReportTab } from '@/components/results/ErrorReportTab'
import {
  RefreshCw, CheckCircle, XCircle, Circle,
  Clock, Trophy, TrendingUp, AlertCircle,
  ArrowLeft, Target, MinusCircle, Timer, Download, Loader2,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';

// ── MatchTable ─────────────────────────────────────────────────────────────
const LEFT_LABELS  = ['A', 'B', 'C', 'D', 'E', 'F']
const RIGHT_LABELS = ['i', 'ii', 'iii', 'iv', 'v', 'vi']

function MatchTable({ matchPairs }: {
  matchPairs: {
    leftColumn:  { header: string; items: string[] }
    rightColumn: { header: string; items: string[] }
  }
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border my-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/60 border-b border-border">
            <th className="text-left px-4 py-2 font-medium w-1/2">{matchPairs.leftColumn.header}</th>
            <th className="text-left px-4 py-2 font-medium w-1/2">{matchPairs.rightColumn.header}</th>
          </tr>
        </thead>
        <tbody>
          {matchPairs.leftColumn.items.map((leftItem, index) => (
            <tr key={index} className="border-b border-border last:border-0">
              <td className="px-4 py-2 align-middle">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold mr-2">
                  {LEFT_LABELS[index]}
                </span>
                {leftItem}
              </td>
              <td className="px-4 py-2 align-middle">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs font-semibold mr-2">
                  {RIGHT_LABELS[index]}
                </span>
                {matchPairs.rightColumn.items[index]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const COLORS = { correct: '#10b981', wrong: '#ef4444', unattempted: '#6b7280' }

const SUBJECT_GRADIENTS = [
  'from-violet-500 to-purple-700', 'from-blue-500 to-cyan-700',
  'from-emerald-500 to-teal-700',  'from-orange-500 to-amber-700',
  'from-pink-500 to-rose-700',     'from-indigo-500 to-blue-700',
  'from-teal-500 to-green-700',    'from-red-500 to-orange-700',
]

function getSubjectGradient(title: string) {
  let hash = 0
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash)
  return SUBJECT_GRADIENTS[Math.abs(hash) % SUBJECT_GRADIENTS.length]
}
function getSubjectInitial(title: string) { return title?.trim()?.[0]?.toUpperCase() || '?' }
function formatTime(seconds: number) {
  if (!seconds || seconds === 0) return '0s'
  const hrs = Math.floor(seconds / 3600), mins = Math.floor((seconds % 3600) / 60), secs = seconds % 60
  return hrs > 0 ? `${hrs}h ${mins}m` : mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}
function getPerformanceLabel(pct: number) {
  if (pct >= 80) return { label: 'Excellent', cls: 'bg-green-100 text-green-700' }
  if (pct >= 60) return { label: 'Good',      cls: 'bg-blue-100 text-blue-700' }
  if (pct >= 40) return { label: 'Average',   cls: 'bg-yellow-100 text-yellow-700' }
  return           { label: 'Needs Work',  cls: 'bg-red-100 text-red-700' }
}

// ── Time Stats ─────────────────────────────────────────────────────────────
function TimeStatsCard({ timeStats, totalTime }: {
  timeStats: { correct: number; wrong: number; unattempted: number }
  totalTime: number
}) {
  const total  = timeStats.correct + timeStats.wrong + timeStats.unattempted || 1
  const blocks = [
    { label: 'Correct',     value: timeStats.correct,     color: 'bg-emerald-500', textColor: 'text-emerald-700', bg: 'bg-emerald-50' },
    { label: 'Wrong',       value: timeStats.wrong,       color: 'bg-red-500',     textColor: 'text-red-700',     bg: 'bg-red-50' },
    { label: 'Unattempted', value: timeStats.unattempted, color: 'bg-gray-400',    textColor: 'text-gray-600',    bg: 'bg-gray-50' },
  ]
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Timer className="w-4 h-4 text-gray-400" /> Time Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex w-full h-4 rounded-full overflow-hidden gap-0.5">
          {blocks.map(b => (
            <div key={b.label} className={`${b.color} transition-all`}
              style={{ width: `${(b.value / total) * 100}%` }}
              title={`${b.label}: ${formatTime(b.value)}`} />
          ))}
        </div>
        <div className="space-y-2">
          {blocks.map(b => (
            <div key={b.label} className={`flex items-center justify-between rounded-lg px-3 py-2 ${b.bg}`}>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${b.color}`} />
                <span className="text-sm text-gray-600">{b.label}</span>
              </div>
              <div className="text-right">
                <span className={`text-sm font-bold ${b.textColor}`}>{formatTime(b.value)}</span>
                <span className="text-xs text-gray-400 ml-2">({((b.value / total) * 100).toFixed(0)}%)</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center">
          Total tracked: {formatTime(total)} of {formatTime(totalTime)} exam time
        </p>
      </CardContent>
    </Card>
  )
}

// ── Scorecard ──────────────────────────────────────────────────────────────
function ScorecardCard({ result }: { result: any }) {
  const { comparisonStats } = result
  if (!comparisonStats?.topper && !comparisonStats?.average) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gray-400" /> You vs Others
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 text-center py-6">
            Be the first to attempt this exam — no comparison data yet!
          </p>
        </CardContent>
      </Card>
    )
  }
  const you     = { score: result.score?.toFixed(1) || '0', correct: result.correctAnswers, wrong: result.wrongAnswers, time: result.timeSpent, percentage: result.percentage?.toFixed(1) || '0' }
  const topper  = comparisonStats.topper
  const average = comparisonStats.average
  const rows = [
    { label: 'Score',    you: `${you.score} / ${result.totalMarks}`,   topper: topper  ? `${topper.score.toFixed(1)} / ${result.totalMarks}`  : null, avg: average ? `${average.score.toFixed(1)} / ${result.totalMarks}` : null },
    { label: 'Accuracy', you: `${you.percentage}%`,                     topper: topper  ? `${topper.percentage.toFixed(1)}%`                   : null, avg: average ? `${average.percentage.toFixed(1)}%`                  : null },
    { label: 'Correct',  you: `${you.correct}`,                         topper: topper  ? `${Math.round(topper.correct)}`                      : null, avg: average ? `${average.correct.toFixed(1)}`                      : null },
    { label: 'Wrong',    you: `${you.wrong}`,                           topper: topper  ? `${Math.round(topper.wrong)}`                        : null, avg: average ? `${average.wrong.toFixed(1)}`                        : null },
    { label: 'Time',     you: formatTime(you.time),                     topper: topper  ? formatTime(Math.round(topper.time))                  : null, avg: average ? formatTime(Math.round(average.time))                 : null },
  ]
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Trophy className="w-4 h-4 text-gray-400" /> You vs Others
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-xs text-gray-400 font-medium w-24">Metric</th>
                <th className="text-center py-2 px-2"><span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">You</span></th>
                {topper  && <th className="text-center py-2 px-2"><span className="inline-block bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">Topper</span></th>}
                {average && <th className="text-center py-2 px-2"><span className="inline-block bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">Avg</span></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                  <td className="py-2 text-xs text-gray-500 font-medium">{row.label}</td>
                  <td className="py-2 px-2 text-center font-semibold text-blue-700">{row.you}</td>
                  {topper  && <td className="py-2 px-2 text-center font-semibold text-amber-700">{row.topper}</td>}
                  {average && <td className="py-2 px-2 text-center text-gray-600">{row.avg}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Progress Over Time chart ───────────────────────────────────────────────
function ProgressChart({ attemptHistory, currentAttemptId }: {
  attemptHistory: any[]
  currentAttemptId: string
}) {
  if (!attemptHistory || attemptHistory.length < 2) return null

  const data = attemptHistory.map(a => ({
    name:       `A${a.attemptNumber}`,
    percentage: parseFloat((a.percentage ?? 0).toFixed(1)),
    isOfficial: a.isOfficial,
    isCurrent:  a.id === currentAttemptId,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          Progress Over Time
          <span className="text-xs text-gray-400 font-normal ml-1">({attemptHistory.length} attempts)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
            <Tooltip
              formatter={(value: any) => [`${value}%`, 'Score']}
              labelFormatter={(label) => {
                const entry = data.find(d => d.name === label)
                return entry ? `${label} ${entry.isOfficial ? '(Official)' : '(Practice)'}` : label
              }}
            />
            <Line
              type="monotone" dataKey="percentage"
              stroke="#6366f1" strokeWidth={2}
              dot={(props: any) => {
                const entry = data[props.index]
                return (
                  <circle
                    key={props.index}
                    cx={props.cx} cy={props.cy} r={entry?.isCurrent ? 6 : 4}
                    fill={entry?.isCurrent ? '#6366f1' : entry?.isOfficial ? '#10b981' : '#f59e0b'}
                    stroke="white" strokeWidth={2}
                  />
                )
              }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 justify-center text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Official</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Practice</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> Current</span>
        </div>
      </CardContent>
    </Card>
  )
}

function ProcessingScreen({ attemptId, onReady }: { attemptId: string; onReady: () => void }) {
  const [dots, setDots] = useState('.')
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '.' : prev + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/attempts/${attemptId}/status`)
        if (!res.ok) return
        const data = await res.json()
        if (data.graded) onReady()
      } catch (e) {
        // silent retry
      }
    }

    poll()
    const interval = setInterval(poll, 3000)
    const timeout = setTimeout(() => {
      clearInterval(interval)
      setTimedOut(true)
    }, 20000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [attemptId, onReady])

  if (timedOut) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3 max-w-sm">
          <CheckCircle className="w-8 h-8 mx-auto text-green-500" />
          <p className="text-sm font-medium text-gray-700">Your exam has been submitted successfully.</p>
          <p className="text-xs text-gray-400">
            Results are being processed and will reflect here shortly.
            You can safely leave this page and check back in a few minutes.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-3">
        <RefreshCw className="w-7 h-7 animate-spin mx-auto text-primary" />
        <p className="text-sm font-medium text-gray-700">Calculating your results{dots}</p>
        <p className="text-xs text-gray-400">This usually takes a few seconds.</p>
      </div>
    </div>
  )
}

// ── page ───────────────────────────────────────────────────────────────────
type SolutionFilter = 'all' | 'correct' | 'wrong' | 'unattempted'

export default function ResultPage() {
  const params    = useParams()
  const router    = useRouter()
  const attemptId = params.id as string

  const [result, setResult]         = useState<any>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [solutionFilter, setSolutionFilter] = useState<SolutionFilter>('all')
  const [pdfGenerating, setPdfGenerating]   = useState(false)

  useEffect(() => { fetchResult() }, [attemptId])

  const fetchResult = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/attempts/${attemptId}/result`)
      const data = await res.json()
      if (res.status === 202 && data.processing) {
        setResult({ __processing: true })
        return
      }
      if (!res.ok) throw new Error('Failed to load results')
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-3">
        <RefreshCw className="w-7 h-7 animate-spin mx-auto text-primary" />
        <p className="text-sm text-gray-500">Loading results...</p>
      </div>
    </div>
  )

  if (result?.__processing) return (
    <ProcessingScreen attemptId={attemptId} onReady={() => fetchResult()} />
  )

  if (error || !result) return (
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

  const pieData = [
    { name: 'Correct',     value: result.correctAnswers },
    { name: 'Wrong',       value: result.wrongAnswers },
    { name: 'Unattempted', value: result.unattempted },
  ]

  const pct      = result.percentage || 0
  const perf     = getPerformanceLabel(pct)
  const gradient = getSubjectGradient(result.examTitle || '')
  const initial  = getSubjectInitial(result.examTitle || '')
  const accuracy = result.correctAnswers > 0
    ? ((result.correctAnswers / (result.correctAnswers + result.wrongAnswers)) * 100).toFixed(1)
    : '0'

  const filteredQuestions = (result.questionResults || []).filter((q: any) => {
    if (solutionFilter === 'all')         return true
    if (solutionFilter === 'correct')     return q.isCorrect
    if (solutionFilter === 'wrong')       return !q.isCorrect && q.yourAnswer !== null
    if (solutionFilter === 'unattempted') return q.yourAnswer === null
    return true
  })

  const filterCounts = {
    all:         result.questionResults?.length || 0,
    correct:     result.correctAnswers          || 0,
    wrong:       result.wrongAnswers            || 0,
    unattempted: result.unattempted             || 0,
  }

  const isPractice = result.isOfficial === false

  // ── PDF Download ──────────────────────────────────────────────────────────
  const downloadSolutionsPDF = () => {
  // Create a hidden iframe with the full solutions HTML
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  // Gather all questions (no filter - always print all)
  const allQuestions = result.questionResults || []

  const questionsHtml = allQuestions.map((q: any, idx: number) => {
    const originalIndex = idx
    const isCorrect = q.isCorrect
    const isWrong = !q.isCorrect && q.yourAnswer !== null

    const statusColor = isCorrect ? '#10b981' : isWrong ? '#ef4444' : '#6b7280'
    const statusBg    = isCorrect ? '#ecfdf5'  : isWrong ? '#fef2f2'  : '#f9fafb'
    const statusText  = isCorrect ? 'Correct'  : isWrong ? 'Wrong'    : 'Unattempted'
    const marksText   = isCorrect ? `+${q.marks}` : isWrong ? `-${q.negativeMarks}` : '0 marks'

    const optionsHtml = (q.questionType === 'mcq' || q.questionType === 'match')
      ? (q.options || []).map((opt: any) => {
          const optIsCorrect = opt.isCorrect
          const optIsYours   = opt.key === q.yourAnswer && !isCorrect
          const bg    = optIsCorrect ? '#ecfdf5' : optIsYours ? '#fef2f2' : 'transparent'
          const color = optIsCorrect ? '#059669' : optIsYours ? '#dc2626' : '#374151'
          const border = optIsCorrect ? '2px solid #10b981' : optIsYours ? '2px solid #ef4444' : '1px solid #e5e7eb'
          const weight = optIsCorrect || optIsYours ? '600' : '400'
          const icon   = optIsCorrect ? '✓' : optIsYours ? '✗' : ''
          const iconColor = optIsCorrect ? '#059669' : '#dc2626'
          return `
            <div style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border-radius:8px;border:${border};background:${bg};margin-bottom:6px;">
              <span style="color:#6b7280;font-weight:600;min-width:20px;">${opt.key}.</span>
              <span style="flex:1;color:${color};font-weight:${weight};">${opt.text || ''}</span>
              ${icon ? `<span style="color:${iconColor};font-weight:700;">${icon}</span>` : ''}
            </div>`
        }).join('')
      : ''

    const numericalHtml = q.questionType === 'numerical' ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;">
        <div style="padding:10px;border-radius:8px;border:2px solid ${isCorrect ? '#10b981' : isWrong ? '#ef4444' : '#e5e7eb'};background:${isCorrect ? '#ecfdf5' : isWrong ? '#fef2f2' : '#f9fafb'}">
          <div style="font-size:10px;color:#6b7280;margin-bottom:4px;">Your Answer</div>
          <div style="font-size:18px;font-weight:700;color:${isCorrect ? '#059669' : isWrong ? '#dc2626' : '#9ca3af'}">${q.yourAnswer || 'Not Attempted'}</div>
        </div>
        <div style="padding:10px;border-radius:8px;border:2px solid #10b981;background:#ecfdf5">
          <div style="font-size:10px;color:#6b7280;margin-bottom:4px;">Correct Answer</div>
          <div style="font-size:18px;font-weight:700;color:#059669">${q.correctAnswer}</div>
        </div>
      </div>` : ''

    const answerSummary = (q.questionType === 'mcq' || q.questionType === 'match') ? `
      <div style="font-size:11px;color:#9ca3af;padding-top:8px;border-top:1px solid #f3f4f6;margin-top:4px;">
        <span><strong>Your answer:</strong> ${q.yourAnswer || 'Not Attempted'}</span>
        &nbsp;&nbsp;
        <span><strong>Correct answer:</strong> ${q.correctAnswer}</span>
      </div>` : ''

    const explanationHtml = q.explanation ? `
      <div style="margin-top:10px;padding:10px 12px;background:#eff6ff;border-radius:8px;border:1px solid #dbeafe;">
        <div style="font-size:11px;font-weight:700;color:#1d4ed8;margin-bottom:4px;">Explanation</div>
        <div style="font-size:12px;color:#1d4ed8;">${q.explanation}</div>
      </div>` : ''

    const imageHtml = q.imageUrl ? `
      <div style="margin-top:8px;">
        <img src="${q.imageUrl}" style="max-width:100%;border-radius:8px;border:1px solid #e5e7eb;" />
      </div>` : ''

    return `
      <div style="border-radius:10px;border:1px solid #e5e7eb;border-left:4px solid ${statusColor};margin-bottom:16px;overflow:hidden;page-break-inside:avoid;">
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:${statusBg};border-bottom:1px solid #f3f4f6;flex-wrap:wrap;">
          <span style="font-weight:700;color:#374151;font-size:13px;">Q${originalIndex + 1}</span>
          <span style="background:${statusColor};color:white;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;">${statusText}</span>
          ${q.topic ? `<span style="font-size:11px;color:#6b7280;">${q.topic}</span>` : ''}
          <span style="margin-left:auto;font-size:11px;color:${statusColor};font-weight:600;">
            ${q.timeSpentSec > 0 ? formatTime(q.timeSpentSec) + '  |  ' : ''}${marksText}
          </span>
        </div>
        <!-- Body -->
        <div style="padding:12px;">
          <div style="font-size:13px;color:#111827;line-height:1.6;margin-bottom:10px;">${q.statement || ''}</div>
          ${imageHtml}
          ${optionsHtml}
          ${numericalHtml}
          ${answerSummary}
          ${explanationHtml}
        </div>
      </div>`
  }).join('')

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${result.examTitle || 'Solutions'}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: white; color: #111827; }
        @media print {
          @page { margin: 12mm 14mm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        .header { background: linear-gradient(135deg, #4338ca, #6366f1); color: white; padding: 20px 24px; margin-bottom: 20px; }
        .header h1 { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
        .header .meta { font-size: 12px; color: #c7d2fe; display: flex; flex-wrap: wrap; gap: 16px; }
        .stats { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .stat { flex: 1; min-width: 100px; padding: 10px 14px; border-radius: 10px; border: 1px solid #e5e7eb; }
        .content { padding: 0 24px 24px; }
        .print-btn { position: fixed; bottom: 24px; right: 24px; background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(79,70,229,0.4); z-index: 1000; }
        .print-btn:hover { background: #4338ca; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${result.examTitle || 'Exam Solutions'}</h1>
        <div class="meta">
          <span>Score: ${result.score?.toFixed(0) || 0} / ${result.totalMarks}</span>
          <span>Correct: ${result.correctAnswers}</span>
          <span>Wrong: ${result.wrongAnswers}</span>
          <span>Unattempted: ${result.unattempted}</span>
          <span>Accuracy: ${accuracy}%</span>
          <span>Time: ${formatTime(result.timeSpent)}</span>
          <span>${new Date(result.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      <div class="content">
        ${questionsHtml}
      </div>

      <button class="print-btn no-print" onclick="window.print()">🖨️ Save as PDF</button>

      <script>
        // Wait for images to load before being ready
        window.onload = () => {
          // slight delay so images render
          setTimeout(() => window.print(), 800)
        }
      </script>
    </body>
    </html>
  `)
  printWindow.document.close()
}

  return (
    <div className="max-w-4xl mx-auto space-y-5 -mt-2">

      <Button variant="ghost" size="sm" onClick={() => router.push('/results')}
        className="-ml-2 h-8 text-gray-500 hover:text-gray-900">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Results
      </Button>

      {/* ── Score Header Card ── */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            <div className={`relative bg-gradient-to-br ${gradient} sm:w-48 h-40 sm:h-auto flex-shrink-0 flex flex-col items-center justify-center gap-2`}>
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
              <div className="relative w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{initial}</span>
              </div>
              <div className="relative text-center">
                <p className="text-3xl font-bold text-white leading-none">{pct.toFixed(1)}%</p>
                <p className="text-white/70 text-xs mt-1">Score</p>
              </div>
            </div>

            <div className="flex-1 p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-xl font-bold text-gray-900">{result.examTitle}</h1>
                  <Badge className={perf.cls}>{perf.label}</Badge>
                  <Badge className={pct >= (result.passingMarks || 40) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {pct >= (result.passingMarks || 40) ? 'Passed' : 'Failed'}
                  </Badge>
                  {isPractice && (
                    <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Practice
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-400">
                  {new Date(result.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                {isPractice && (
                  <p className="text-xs text-blue-600 mt-1">
                    Practice attempt — this score does not affect your rank or leaderboard position.
                  </p>
                )}
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900">{result.score?.toFixed(0) || 0}</span>
                <span className="text-lg text-gray-400">/ {result.totalMarks}</span>
                <span className="text-sm text-gray-400 ml-2">marks</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { icon: Clock,      label: 'Time',       value: formatTime(result.timeSpent) },
                  { icon: Trophy,     label: 'Rank',       value: isPractice ? 'Practice' : result.rank ? `#${result.rank} / ${result.totalAttempts}` : 'N/A' },
                  { icon: TrendingUp, label: 'Percentile', value: isPractice ? '—' : result.percentile ? `${Number(result.percentile).toFixed(1)}%` : 'N/A' },
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
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="report-error">Report Error</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Answer Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`} outerRadius={90} dataKey="value">
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.name === 'Correct' ? COLORS.correct : entry.name === 'Wrong' ? COLORS.wrong : COLORS.unattempted} />
                      ))}
                    </Pie>
                    <Legend /><Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Topic-wise Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.topicWisePerformance?.length > 0
                    ? result.topicWisePerformance.map((topic: any) => (
                        <div key={topic.topic}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-gray-700 truncate">{topic.topic}</span>
                            <span className="text-gray-400 flex-shrink-0 ml-2">{topic.correct}/{topic.total} ({topic.accuracy.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full transition-all ${topic.accuracy >= 75 ? 'bg-green-500' : topic.accuracy >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${topic.accuracy}%` }} />
                          </div>
                        </div>
                      ))
                    : <p className="text-sm text-gray-400 text-center py-8">No topic data available</p>
                  }
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {result.timeStats && <TimeStatsCard timeStats={result.timeStats} totalTime={result.timeSpent} />}
            <ScorecardCard result={result} />
          </div>

          {result.attemptHistory?.length >= 2 && (
            <ProgressChart attemptHistory={result.attemptHistory} currentAttemptId={attemptId} />
          )}
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard">
          {isPractice && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
              <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
              This was a practice attempt. The leaderboard shows official attempts only.
            </div>
          )}
          <LeaderboardCard type="exam" examId={result.examId} limit={25} showTitle={true} />
        </TabsContent>

        {/* ── Solutions Tab ── */}
        <TabsContent value="solutions" className="space-y-3">

          {/* Filter row + Download button */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Filter pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {([
                { key: 'all',         label: 'All',         count: filterCounts.all,         activeClass: 'bg-gray-900 text-white' },
                { key: 'correct',     label: 'Correct',     count: filterCounts.correct,     activeClass: 'bg-emerald-600 text-white' },
                { key: 'wrong',       label: 'Incorrect',   count: filterCounts.wrong,       activeClass: 'bg-red-500 text-white' },
                { key: 'unattempted', label: 'Unattempted', count: filterCounts.unattempted, activeClass: 'bg-gray-400 text-white' },
              ] as const).map(f => (
                <button key={f.key} onClick={() => setSolutionFilter(f.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                    solutionFilter === f.key ? `${f.activeClass} border-transparent` : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}>
                  {f.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${solutionFilter === f.key ? 'bg-white/20' : 'bg-gray-100'}`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Download PDF button */}
            <Button
              size="sm"
              variant="outline"
              onClick={downloadSolutionsPDF}
              disabled={pdfGenerating}
              className="flex items-center gap-1.5 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              {pdfGenerating
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generating...</>
                : <><Download className="h-3.5 w-3.5" />Download PDF</>
              }
            </Button>
          </div>

          {/* Question cards */}
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No questions in this category.</div>
          ) : (
            filteredQuestions.map((q: any) => {
              const originalIndex = result.questionResults.findIndex((orig: any) => orig.questionId === q.questionId)
              return (
                <Card key={q.questionId} className={`border-l-4 ${q.isCorrect ? 'border-l-green-500' : q.yourAnswer ? 'border-l-red-500' : 'border-l-gray-300'}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-500">Q{originalIndex + 1}</span>
                      {q.questionType === 'numerical' && <Badge variant="outline" className="text-blue-600 text-xs">NAT</Badge>}
                      {q.questionType === 'match' && <Badge variant="outline" className="text-violet-600 text-xs">Match</Badge>}
                      {q.isCorrect ? <CheckCircle className="w-4 h-4 text-green-500" /> : q.yourAnswer ? <XCircle className="w-4 h-4 text-red-500" /> : <Circle className="w-4 h-4 text-gray-400" />}
                      {q.timeSpentSec > 0 && (
                        <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />{formatTime(q.timeSpentSec)}
                        </span>
                      )}
                      <span className={`text-xs text-gray-400 ${q.timeSpentSec > 0 ? '' : 'ml-auto'}`}>
                        {q.isCorrect ? `+${q.marks}` : q.yourAnswer ? `-${q.negativeMarks}` : '0'} marks
                      </span>
                    </div>
                    <div className="mt-2 text-sm leading-relaxed space-y-3">
                      <SafeHtml html={q.statement} />
                      {q.imageUrl && (
                        <div className="mt-2">
                          <OptimizedImage src={q.imageUrl} alt={`Q${originalIndex + 1}`} className="max-w-full rounded-lg border shadow-sm" />
                        </div>
                      )}
                      {q.questionType === 'match' && q.matchPairs && (
                        <MatchTable matchPairs={q.matchPairs} />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {q.questionType === 'mcq' && (
                      <div className="space-y-1.5">
                        {q.options?.map((opt: any) => (
                          <div key={opt.key} className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm ${opt.isCorrect ? 'border-green-400 bg-green-50' : opt.key === q.yourAnswer && !q.isCorrect ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}>
                            <span className="font-semibold text-gray-500 w-4">{opt.key}.</span>
                            <SafeHtml html={opt.text} className="flex-1" />
                            {opt.isCorrect && <CheckCircle className="w-4 h-4 text-green-600 ml-auto flex-shrink-0" />}
                            {opt.key === q.yourAnswer && !q.isCorrect && <XCircle className="w-4 h-4 text-red-500 ml-auto flex-shrink-0" />}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.questionType === 'match' && (
                      <div className="space-y-1.5">
                        {q.options?.map((opt: any) => (
                          <div key={opt.key} className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm ${opt.isCorrect ? 'border-green-400 bg-green-50' : opt.key === q.yourAnswer && !q.isCorrect ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}>
                            <span className="font-semibold text-gray-500 w-4">{opt.key}.</span>
                            <span className="flex-1">{opt.text}</span>
                            {opt.isCorrect && <CheckCircle className="w-4 h-4 text-green-600 ml-auto flex-shrink-0" />}
                            {opt.key === q.yourAnswer && !q.isCorrect && <XCircle className="w-4 h-4 text-red-500 ml-auto flex-shrink-0" />}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.questionType === 'numerical' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`p-3 rounded-lg border-2 ${q.yourAnswer ? q.isCorrect ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                          <p className="text-xs text-gray-500 mb-1">Your Answer</p>
                          <p className={`text-xl font-bold ${q.yourAnswer ? q.isCorrect ? 'text-green-700' : 'text-red-700' : 'text-gray-400'}`}>{q.yourAnswer || 'Not Attempted'}</p>
                        </div>
                        <div className="p-3 rounded-lg border-2 border-green-400 bg-green-50">
                          <p className="text-xs text-gray-500 mb-1">Correct Answer</p>
                          <p className="text-xl font-bold text-green-700">{q.correctAnswer}</p>
                        </div>
                      </div>
                    )}

                    {(q.questionType === 'mcq' || q.questionType === 'match') && (
                      <div className="flex gap-4 text-xs text-gray-500 pt-1 border-t">
                        <span><strong>Your:</strong> {q.yourAnswer || 'Not Attempted'}</span>
                        <span><strong>Correct:</strong> {q.correctAnswer}</span>
                      </div>
                    )}

                    {q.explanation && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-xs font-semibold text-blue-800 mb-1">Explanation</p>
                        <div className="text-xs text-blue-700"><SafeHtml html={q.explanation} /></div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback">
          <FeedbackTab examId={result.examId} attemptId={attemptId} />
        </TabsContent>

        {/* Report Error Tab */}
        <TabsContent value="report-error">
          <ErrorReportTab
            examId={result.examId}
            attemptId={attemptId}
            questionResults={result.questionResults || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}