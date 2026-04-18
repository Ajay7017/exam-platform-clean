'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Clock,
  FileQuestion,
  Search,
  Play,
  BookOpen,
  Loader2,
  Trophy,
  Calendar,
  LayoutGrid,
  List,
  RotateCcw,
  Package,
  ChevronDown,
  ChevronUp,
  Infinity,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

// ── types ──────────────────────────────────────────────────────────────────

interface MyExam {
  id: string
  title: string
  slug: string
  subject: string
  subjectSlug: string
  thumbnail: string
  duration: number
  totalQuestions: number
  totalMarks: number
  difficulty: 'easy' | 'medium' | 'hard'
  isFree: boolean
  purchasedAt: string
  validUntil: string
  hasAttempted: boolean
  lastAttemptStatus: string | null
  lastScore: number | null
  lastScorePercentage: number | null
  lastAttemptDate: string | null
}

interface BundleExamItem {
  id: string
  title: string
  slug: string
  subject: string
  duration: number
  totalQuestions: number
  difficulty: string
}

interface MyBundle {
  id: string
  type: 'bundle'
  purchasedAt: string
  price: number
  status: string
  bundle: {
    id: string
    name: string
    slug: string
    description: string | null
    totalExams: number
    discount: number
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

function getSubjectGradient(subject: string) {
  let hash = 0
  for (let i = 0; i < subject.length; i++)
    hash = subject.charCodeAt(i) + ((hash << 5) - hash)
  return SUBJECT_GRADIENTS[Math.abs(hash) % SUBJECT_GRADIENTS.length]
}

function getSubjectInitial(subject: string) {
  return subject?.trim()?.[0]?.toUpperCase() || '?'
}

function getDifficultyColor(d: string) {
  switch (d) {
    case 'easy':   return 'bg-green-100 text-green-700'
    case 'medium': return 'bg-yellow-100 text-yellow-700'
    case 'hard':   return 'bg-red-100 text-red-700'
    default:       return 'bg-gray-100 text-gray-700'
  }
}

function getTimeAgo(dateString: string | null) {
  if (!dateString) return null
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  } catch {
    return null
  }
}

function ScorePill({ score, total, pct }: { score: number; total: number; pct: number | null }) {
  const p = pct ?? Math.round((score / total) * 100)
  const color =
    p >= 75 ? 'bg-green-50 text-green-700 border-green-200' :
    p >= 50 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
              'bg-red-50 text-red-700 border-red-200'
  return (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${color}`}>
      <span className="flex items-center gap-1">
        <Trophy className="h-3.5 w-3.5" />Last Score
      </span>
      <span className="font-semibold">{score}/{total} ({p}%)</span>
    </div>
  )
}

// ── Exam Grid Card ─────────────────────────────────────────────────────────

function ExamGridCard({ exam, onStart }: { exam: MyExam; onStart: () => void }) {
  const gradient = getSubjectGradient(exam.subject)
  const initial  = getSubjectInitial(exam.subject)

  return (
    <Card className="hover:shadow-lg transition-shadow overflow-hidden">
      <CardContent className="p-0">
        <div className={`relative h-36 bg-gradient-to-br ${gradient} overflow-hidden`}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{initial}</span>
            </div>
            <span className="text-white/80 text-xs font-medium tracking-wide uppercase">{exam.subject}</span>
          </div>
          <div className="absolute top-3 left-3">
            <Badge className={getDifficultyColor(exam.difficulty)}>{exam.difficulty}</Badge>
          </div>
          <div className="absolute top-3 right-3">
            {exam.isFree
              ? <Badge className="bg-green-100 text-green-800">Free</Badge>
              : <Badge className="bg-blue-100 text-blue-800">Purchased</Badge>
            }
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-gray-900 truncate" title={exam.title}>{exam.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{exam.subject}</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /><span>{exam.duration}min</span></div>
            <div className="flex items-center gap-1"><FileQuestion className="h-3.5 w-3.5" /><span>{exam.totalQuestions} Q</span></div>
            <div className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5" /><span>{exam.totalMarks} marks</span></div>
          </div>
          {exam.hasAttempted && exam.lastScore !== null && (
            <ScorePill score={exam.lastScore} total={exam.totalMarks} pct={exam.lastScorePercentage} />
          )}
          {exam.lastAttemptDate && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar className="h-3 w-3" />
              <span>Attempted {getTimeAgo(exam.lastAttemptDate)}</span>
            </div>
          )}
          <Button className="w-full" size="sm" onClick={onStart}>
            {exam.hasAttempted
              ? <><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Retake Exam</>
              : <><Play className="h-3.5 w-3.5 mr-1.5" />Start Exam</>
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Exam List Row ──────────────────────────────────────────────────────────

function ExamListRow({ exam, onStart }: { exam: MyExam; onStart: () => void }) {
  const gradient = getSubjectGradient(exam.subject)
  const initial  = getSubjectInitial(exam.subject)

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b last:border-0 hover:bg-gray-50 transition-colors">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
        <span className="text-white font-bold text-sm">{initial}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{exam.title}</p>
        <p className="text-xs text-gray-500">{exam.subject}</p>
      </div>
      <Badge className={`hidden sm:inline-flex ${getDifficultyColor(exam.difficulty)}`}>{exam.difficulty}</Badge>
      <div className="hidden md:flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{exam.duration}min</div>
        <div className="flex items-center gap-1"><FileQuestion className="h-3.5 w-3.5" />{exam.totalQuestions} Q</div>
      </div>
      {exam.hasAttempted && exam.lastScore !== null ? (
        <div className="hidden sm:block text-sm font-semibold text-blue-700 w-24 text-right">
          {exam.lastScore}/{exam.totalMarks}
          <span className="text-xs text-gray-500 font-normal ml-1">({exam.lastScorePercentage}%)</span>
        </div>
      ) : (
        <div className="hidden sm:block w-24" />
      )}
      <Button size="sm" onClick={onStart} className="flex-shrink-0">
        {exam.hasAttempted
          ? <><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Retake</>
          : <><Play className="h-3.5 w-3.5 mr-1.5" />Start</>
        }
      </Button>
    </div>
  )
}

// ── Bundle Card (My Exams view) ────────────────────────────────────────────

function BundleCard({ purchase }: { purchase: MyBundle }) {
  const [expanded, setExpanded] = useState(false)
  const { bundle, purchasedAt } = purchase

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex gap-4">
          {/* Icon */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center flex-shrink-0 relative">
            <Package className="h-7 w-7 text-white" />
            <span className="absolute -top-1.5 -right-1.5 bg-white border border-purple-200 text-purple-700 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
              {bundle.totalExams}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{bundle.name}</p>
                {bundle.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{bundle.description.split('\n')[0]}</p>
                )}
              </div>
              <Badge className="bg-green-100 text-green-800 shrink-0">Active</Badge>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {bundle.totalExams} Exams
              </span>
              <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Infinity className="h-3 w-3" />Lifetime Access
              </span>
              {bundle.discount > 0 && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                  {bundle.discount}% OFF applied
                </span>
              )}
            </div>

            <p className="text-xs text-gray-400 mt-2">
              Purchased {getTimeAgo(purchasedAt)}
            </p>

            {/* Explore link */}
            <div className="flex items-center gap-3 mt-3">
              <Button size="sm" asChild>
                <Link href={`/bundles/${bundle.slug}`}>Explore Bundle</Link>
              </Button>
              <button
                onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                {expanded
                  ? <><ChevronUp className="h-3.5 w-3.5" />Hide exams</>
                  : <><ChevronDown className="h-3.5 w-3.5" />View {bundle.totalExams} exams</>
                }
              </button>
            </div>

            {/* Expanded exam list */}
            {expanded && (
              <div className="mt-3 space-y-2">
                {bundle.exams.map(exam => (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{exam.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-500">{exam.subject}</span>
                        <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">{exam.duration}m</span>
                        <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <FileQuestion className="h-3 w-3" />{exam.totalQuestions}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getDifficultyColor(exam.difficulty)}`}>
                          {exam.difficulty}
                        </span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" asChild>
                      <Link href={`/exam/${exam.slug}/start`}>Start</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

type Tab = 'exams' | 'bundles'

export default function MyExamsPage() {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<Tab>('exams')
  const [exams, setExams] = useState<MyExam[]>([])
  const [bundles, setBundles] = useState<MyBundle[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('myExamViewMode') as 'grid' | 'list') || 'grid'
    }
    return 'grid'
  })

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    localStorage.setItem('myExamViewMode', viewMode)
  }, [viewMode])

  const fetchAll = async () => {
    try {
      setLoading(true)
      // Fetch both in parallel
      const [examsRes, purchasesRes] = await Promise.all([
        fetch('/api/student/my-exams'),
        fetch('/api/student/purchases'),
      ])
      if (!examsRes.ok) throw new Error('Failed to fetch exams')
      const examsData = await examsRes.json()
      setExams(examsData.exams || [])

      if (purchasesRes.ok) {
        const purchasesData = await purchasesRes.json()
        setBundles(purchasesData.bundlePurchases || [])
      }
    } catch (error: any) {
      toast.error('Failed to load your exams')
    } finally {
      setLoading(false)
    }
  }

  const filteredExams = exams.filter(
    e =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.subject.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const attempted  = exams.filter(e => e.hasAttempted).length
  const notStarted = exams.length - attempted

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Exams</h1>
        <p className="mt-1 text-gray-600">
          {exams.length > 0
            ? `${exams.length} enrolled · ${attempted} attempted · ${notStarted} not started`
            : 'Quick access to all your enrolled exams and bundles'}
        </p>
      </div>

      {/* ── Tab switcher ── */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {([
          { key: 'exams' as Tab,   label: 'Single Exams', icon: BookOpen, count: exams.length },
          { key: 'bundles' as Tab, label: 'My Bundles',   icon: Package,  count: bundles.length },
        ]).map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══ SINGLE EXAMS TAB ══════════════════════════════════════════════ */}
      {activeTab === 'exams' && (
        <>
          {/* Search + View toggle */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search your exams..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-1 border rounded-md p-1 h-10 self-start flex-shrink-0">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Grid view"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-2 rounded transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                    title="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {searchQuery && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    Found {filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>Clear</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {loading && (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {!loading && exams.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={BookOpen}
                  title="No exams yet"
                  description="Browse our exam catalog and start your first exam to see it here"
                  action={{ label: 'Browse Exams', onClick: () => router.push('/exams') }}
                />
              </CardContent>
            </Card>
          )}

          {!loading && exams.length > 0 && filteredExams.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={Search}
                  title="No matching exams"
                  description={`No exams found matching "${searchQuery}"`}
                  action={{ label: 'Clear Search', onClick: () => setSearchQuery('') }}
                />
              </CardContent>
            </Card>
          )}

          {!loading && filteredExams.length > 0 && viewMode === 'grid' && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredExams.map((exam, index) => (
                <div key={exam.id} className="animate-scale-in" style={{ animationDelay: `${index * 0.05}s` }}>
                  <ExamGridCard exam={exam} onStart={() => router.push(`/exam/${exam.slug}/start`)} />
                </div>
              ))}
            </div>
          )}

          {!loading && filteredExams.length > 0 && viewMode === 'list' && (
            <Card>
              <CardContent className="p-0">
                {filteredExams.map(exam => (
                  <ExamListRow key={exam.id} exam={exam} onStart={() => router.push(`/exam/${exam.slug}/start`)} />
                ))}
              </CardContent>
            </Card>
          )}

          {!loading && filteredExams.length > 0 && (
            <div className="text-center text-sm text-gray-500">
              Showing {filteredExams.length} of {exams.length} exams
            </div>
          )}
        </>
      )}

      {/* ══ MY BUNDLES TAB ════════════════════════════════════════════════ */}
      {activeTab === 'bundles' && (
        <>
          {loading && (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {!loading && bundles.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={Package}
                  title="No bundles yet"
                  description="Purchase a test bundle to get access to multiple exams at a discounted price"
                  action={{ label: 'Browse Bundles', onClick: () => router.push('/exams?tab=bundles') }}
                />
              </CardContent>
            </Card>
          )}

          {!loading && bundles.length > 0 && (
            <div className="space-y-4">
              {bundles.map(purchase => (
                <BundleCard key={purchase.id} purchase={purchase} />
              ))}
              <div className="text-center text-sm text-gray-500">
                {bundles.length} bundle{bundles.length !== 1 ? 's' : ''} purchased
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}