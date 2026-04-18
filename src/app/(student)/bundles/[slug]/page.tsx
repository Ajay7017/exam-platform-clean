// src/app/(student)/bundles/[slug]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Loader2,
  Package,
  Clock,
  FileQuestion,
  Users,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import BundlePurchaseButton from '@/app/(student)/bundles/[slug]/components/BundlePurchaseButton'

// ── types ──────────────────────────────────────────────────────────────────

interface BundleExam {
  id: string
  title: string
  slug: string
  subject: string
  subjectSlug: string
  duration: number
  totalQuestions: number
  totalMarks: number
  difficulty: 'easy' | 'medium' | 'hard'
  price: number
  isFree: boolean
  totalAttempts: number
}

interface BundleDetails {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  originalPrice: number
  discount: number
  isPurchased: boolean
  totalExams: number
  totalMarketValue: number
  savings: number
  exams: BundleExam[]
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

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
}

// ── page ───────────────────────────────────────────────────────────────────

export default function BundleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [bundle, setBundle] = useState<BundleDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBundle()
  }, [slug])

  const fetchBundle = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/bundles/${slug}`)
      if (!res.ok) {
        if (res.status === 404) {
          toast.error('Bundle not found')
          router.push('/exams')
          return
        }
        throw new Error('Failed to fetch bundle')
      }
      const data = await res.json()
      setBundle(data)
    } catch (err: any) {
      toast.error('Failed to load bundle details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!bundle) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Bundle not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 -mt-2">

      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/exams')}
        className="-ml-2 h-8 text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Browse
      </Button>

      {/* ── Header card ── */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">

            {/* Left panel */}
            <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 md:w-56 h-48 md:h-auto flex-shrink-0 flex flex-col items-center justify-center gap-3">
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                  backgroundSize: '18px 18px',
                }}
              />
              <div className="relative w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                <Package className="h-8 w-8 text-white" />
              </div>
              <span className="relative text-white/80 text-xs font-medium tracking-widest uppercase">
                Test Bundle
              </span>
              <div className="relative text-center">
                <span className="text-white font-bold text-lg">{bundle.totalExams}</span>
                <span className="text-white/70 text-xs block">Exams Included</span>
              </div>
            </div>

            {/* Right info */}
            <div className="flex-1 p-5 flex flex-col gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge className="bg-indigo-100 text-indigo-800 text-xs">Bundle</Badge>
                  {bundle.isPurchased && (
                    <Badge className="text-xs bg-green-100 text-green-800">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Purchased
                    </Badge>
                  )}
                  {bundle.discount > 0 && (
                    <Badge className="text-xs bg-orange-100 text-orange-700">
                      {bundle.discount}% OFF
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{bundle.name}</h1>
                {bundle.description && (
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                    {bundle.description}
                  </p>
                )}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                {[
                  { icon: Package,  label: 'Total Exams', value: bundle.totalExams },
                  {
                    icon: Sparkles,
                    label: 'You Save',
                    value: bundle.savings > 0
                      ? `₹${(bundle.savings / 100).toFixed(0)}`
                      : '—',
                  },
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"
                  >
                    <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Purchase button */}
              <div className="mt-auto">
                <BundlePurchaseButton
                  bundleId={bundle.id}
                  bundleName={bundle.name}
                  price={bundle.price}
                  originalPrice={bundle.originalPrice}
                  discount={bundle.discount}
                  isPurchased={bundle.isPurchased}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Included Exams ── */}
      <Card>
        <CardContent className="p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Included Exams ({bundle.totalExams})
          </h2>
          <div className="space-y-3">
            {bundle.exams.map((exam) => {
              const gradient = getSubjectGradient(exam.subject)
              const initial = exam.subject?.trim()?.[0]?.toUpperCase() || '?'

              return (
                <div
                  key={exam.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  {/* Subject icon */}
                  <div
                    className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}
                  >
                    <span className="text-white font-bold text-sm">{initial}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {exam.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-500">{exam.subject}</span>
                      <Badge className={`text-xs py-0 ${difficultyColors[exam.difficulty]}`}>
                        {exam.difficulty}
                      </Badge>
                    </div>
                  </div>

                  {/* Exam meta */}
                  <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {exam.duration}m
                    </span>
                    <span className="flex items-center gap-1">
                      <FileQuestion className="h-3 w-3" />
                      {exam.totalQuestions} Q
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {exam.totalAttempts}
                    </span>
                  </div>

                  {/* Individual price (crossed out if bundle purchased) */}
                  <div className="flex-shrink-0 text-right">
                    {exam.isFree ? (
                      <span className="text-xs text-green-600 font-medium">Free</span>
                    ) : (
                      <span className={`text-xs font-medium ${bundle.isPurchased ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        ₹{(exam.price / 100).toFixed(0)}
                      </span>
                    )}
                  </div>

                  {/* View / Start link */}
                  {bundle.isPurchased && (
                    <Button size="sm" variant="outline" className="flex-shrink-0 h-7 text-xs" asChild>
                      <Link href={`/exam/${exam.slug}/start`}>Start</Link>
                    </Button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Savings callout */}
          {bundle.savings > 0 && !bundle.isPurchased && (
            <div className="mt-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <Sparkles className="h-4 w-4 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800">
                Buy this bundle and save{' '}
                <span className="font-bold">₹{(bundle.savings / 100).toFixed(0)}</span>{' '}
                compared to buying each exam individually.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Bundle Summary ── */}
      <Card>
        <CardContent className="p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Bundle Summary</h2>
          <div className="divide-y divide-gray-100 text-sm">
            {[
              { label: 'Total Exams', value: bundle.totalExams },
              { label: 'Access',      value: 'Lifetime' },
              ...(bundle.discount > 0
                ? [
                    {
                      label: 'Original Price',
                      value: (
                        <span className="line-through text-gray-400">
                          ₹{(bundle.originalPrice / 100).toFixed(0)}
                        </span>
                      ),
                    },
                    {
                      label: 'Discount',
                      value: (
                        <span className="text-green-600 font-semibold">
                          {bundle.discount}% off
                        </span>
                      ),
                    },
                  ]
                : []),
              {
                label: 'Final Price',
                value: (
                  <span className="font-bold text-gray-900">
                    ₹{(bundle.price / 100).toFixed(0)}
                  </span>
                ),
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-900">{value as any}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}