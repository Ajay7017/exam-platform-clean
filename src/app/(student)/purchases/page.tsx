// src/app/(student)/purchases/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  ShoppingBag,
  Package,
  CheckCircle2,
  Clock,
  XCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Infinity,
  CreditCard,
  Loader2,
  FileQuestion,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// ── Types ──────────────────────────────────────────────────────────────────

interface PaymentInfo {
  razorpayPaymentId: string | null
  method: string | null
  paidAt: string | null
}

interface ExamPurchase {
  id: string
  type: 'exam'
  purchasedAt: string
  validUntil: string | null
  price: number
  status: string
  payment: PaymentInfo | null
  exam: {
    id: string
    title: string
    slug: string
    thumbnail: string | null
    duration: number
    totalQuestions: number
    totalMarks: number
    difficulty: string
    isFree: boolean
    subject: string
    subjectSlug: string
  }
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

interface BundlePurchase {
  id: string
  type: 'bundle'
  purchasedAt: string
  validUntil: null
  price: number
  status: string
  payment: PaymentInfo | null
  bundle: {
    id: string
    name: string
    slug: string
    description: string | null
    price: number
    discount: number
    totalExams: number
    exams: BundleExamItem[]
  }
}

interface PurchasesData {
  examPurchases: ExamPurchase[]
  bundlePurchases: BundlePurchase[]
  totals: { exams: number; bundles: number }
}

// ── Helpers ────────────────────────────────────────────────────────────────

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    active: {
      style: 'bg-green-100 text-green-800 border-green-200',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    pending: {
      style: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: <Clock className="h-3 w-3" />,
    },
    failed: {
      style: 'bg-red-100 text-red-800 border-red-200',
      icon: <XCircle className="h-3 w-3" />,
    },
    expired: {
      style: 'bg-gray-100 text-gray-700 border-gray-200',
      icon: <XCircle className="h-3 w-3" />,
    },
  }
  const { style, icon } = config[status as keyof typeof config] ?? config.pending
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${style}`}>
      {icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function PaymentMeta({ payment, price }: { payment: PaymentInfo | null; price: number }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 mt-2">
      <span>
        <span className="font-medium text-gray-700">Amount: </span>
        {price === 0 ? 'Free' : `₹${(price / 100).toFixed(2)}`}
      </span>
      {payment?.method && (
        <span>
          <span className="font-medium text-gray-700">Via: </span>
          {payment.method}
        </span>
      )}
      {payment?.razorpayPaymentId && (
        <span className="font-mono">
          <span className="font-medium text-gray-700 font-sans">ID: </span>
          {payment.razorpayPaymentId}
        </span>
      )}
    </div>
  )
}

// ── Exam Purchase Card ─────────────────────────────────────────────────────

function ExamPurchaseCard({ purchase }: { purchase: ExamPurchase }) {
  const { exam, payment, purchasedAt, validUntil, price, status } = purchase
  const isExpired = validUntil ? new Date(validUntil) < new Date() : false
  const effectiveStatus = isExpired ? 'expired' : status

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex gap-4">
          {/* Thumbnail */}
          {exam.thumbnail ? (
            <img
              src={exam.thumbnail}
              alt={exam.title}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <BookOpen className="h-7 w-7 text-white" />
            </div>
          )}

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{exam.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{exam.subject}</p>
              </div>
              <StatusBadge status={effectiveStatus} />
            </div>

            {/* Exam meta pills */}
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {exam.duration}m
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {exam.totalQuestions} Qs
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColors[exam.difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
                {exam.difficulty}
              </span>
              {exam.isFree && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Free
                </span>
              )}
            </div>

            {/* Validity */}
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2 text-xs text-gray-500">
              <span>
                Purchased{' '}
                <span className="text-gray-700 font-medium">
                  {formatDistanceToNow(new Date(purchasedAt), { addSuffix: true })}
                </span>
              </span>
              {validUntil && (
                <span>
                  Valid until{' '}
                  <span className={`font-medium ${isExpired ? 'text-red-600' : 'text-gray-700'}`}>
                    {new Date(validUntil).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </span>
              )}
            </div>

            <PaymentMeta payment={payment} price={price} />

            {/* Action */}
            {effectiveStatus === 'active' && (
              <div className="mt-3">
                <Button size="sm" asChild>
                  <Link href={`/exam/${exam.slug}/start`}>Start Exam</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Bundle Purchase Card ───────────────────────────────────────────────────

function BundlePurchaseCard({ purchase }: { purchase: BundlePurchase }) {
  const [expanded, setExpanded] = useState(false)
  const { bundle, payment, purchasedAt, price, status } = purchase

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex gap-4">
          {/* Bundle icon */}
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center flex-shrink-0 relative">
            <Package className="h-7 w-7 text-white" />
            {/* Exam count badge */}
            <span className="absolute -top-1.5 -right-1.5 bg-white border border-purple-200 text-purple-700 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
              {bundle.totalExams}
            </span>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 truncate">{bundle.name}</p>
                  <Badge className="bg-violet-100 text-violet-800 text-xs shrink-0">Bundle</Badge>
                </div>
                {bundle.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{bundle.description}</p>
                )}
              </div>
              <StatusBadge status={status} />
            </div>

            {/* Bundle meta */}
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {bundle.totalExams} Exams
              </span>
              <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Infinity className="h-3 w-3" />
                Lifetime Access
              </span>
              {bundle.discount > 0 && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                  {bundle.discount}% OFF applied
                </span>
              )}
            </div>

            {/* Validity */}
            <div className="mt-2 text-xs text-gray-500">
              Purchased{' '}
              <span className="text-gray-700 font-medium">
                {formatDistanceToNow(new Date(purchasedAt), { addSuffix: true })}
              </span>
            </div>

            <PaymentMeta payment={payment} price={price} />

            {/* Expand / collapse included exams */}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" /> Hide included exams
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" /> View {bundle.totalExams} included exams
                </>
              )}
            </button>

            {/* Included exams list */}
            {expanded && (
              <div className="mt-3 space-y-2">
                {bundle.exams.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{exam.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-500">{exam.subject}</span>
                        <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                          {exam.duration}m
                        </span>
                        <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <FileQuestion className="h-3 w-3" />
                          {exam.totalQuestions}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${difficultyColors[exam.difficulty] ?? 'bg-gray-200 text-gray-600'}`}>
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

// ── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ type }: { type: 'exam' | 'bundle' }) {
  return (
    <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        {type === 'bundle' ? (
          <Package className="h-7 w-7 text-gray-400" />
        ) : (
          <BookOpen className="h-7 w-7 text-gray-400" />
        )}
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">
        No {type === 'bundle' ? 'bundle' : 'exam'} purchases yet
      </h3>
      <p className="text-sm text-gray-500 mb-5">
        {type === 'bundle'
          ? 'Get more value by purchasing a test bundle.'
          : 'Browse and purchase exams to get started.'}
      </p>
      <Button asChild size="sm">
        <Link href="/exams">Browse {type === 'bundle' ? 'Bundles' : 'Exams'}</Link>
      </Button>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

type Tab = 'exams' | 'bundles'

export default function PurchasesPage() {
  const [tab, setTab] = useState<Tab>('exams')
  const [data, setData] = useState<PurchasesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/student/purchases')
      .then((r) => {
        if (!r.ok) throw new Error('Failed')
        return r.json()
      })
      .then((d: PurchasesData) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
      </div>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Failed to load purchases. Please refresh.</p>
      </div>
    )
  }

  const totalAll = (data?.totals.exams ?? 0) + (data?.totals.bundles ?? 0)

  // ── Completely empty ──
  if (totalAll === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">My Purchases</h1>
        <p className="text-gray-500 text-sm mb-8">Your purchase history will appear here.</p>
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="h-7 w-7 text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">No purchases yet</h3>
          <p className="text-sm text-gray-500 mb-5">
            Start exploring our exams and bundles to make your first purchase.
          </p>
          <Button asChild>
            <Link href="/exams">Browse Exams</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Purchases</h1>
        <p className="text-gray-500 text-sm mt-1">
          {totalAll} purchase{totalAll !== 1 ? 's' : ''} total
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(
          [
            {
              key: 'exams' as Tab,
              label: 'Single Exams',
              count: data?.totals.exams ?? 0,
              icon: <BookOpen className="h-3.5 w-3.5" />,
            },
            {
              key: 'bundles' as Tab,
              label: 'Bundles',
              count: data?.totals.bundles ?? 0,
              icon: <Package className="h-3.5 w-3.5" />,
            },
          ] as const
        ).map(({ key, label, count, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {icon}
            {label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                tab === key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Payment method legend */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <CreditCard className="h-3.5 w-3.5" />
        <span>All amounts in INR (paise ÷ 100)</span>
      </div>

      {/* Tab content */}
      {tab === 'exams' && (
        <div className="space-y-3">
          {data?.examPurchases.length === 0 ? (
            <EmptyState type="exam" />
          ) : (
            data?.examPurchases.map((p) => <ExamPurchaseCard key={p.id} purchase={p} />)
          )}
        </div>
      )}

      {tab === 'bundles' && (
        <div className="space-y-3">
          {data?.bundlePurchases.length === 0 ? (
            <EmptyState type="bundle" />
          ) : (
            data?.bundlePurchases.map((p) => <BundlePurchaseCard key={p.id} purchase={p} />)
          )}
        </div>
      )}
    </div>
  )
}