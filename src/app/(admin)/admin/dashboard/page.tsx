// src/app/(admin)/admin/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users, FileQuestion, BookOpen, IndianRupee,
  Loader2, Activity, Package, ShoppingBag,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalQuestions: { count: number; change: string }
  activeExams:    { count: number; drafts: number; change: string }
  totalUsers:     { count: number; change: string }
  revenue:        { total: number; formatted: string; change: string }
}

interface BundleStats {
  total:          number
  active:         number
  totalPurchases: number
}

interface PurchaseBreakdown {
  examPurchases:   number
  bundlePurchases: number
  total:           number
}

interface RecentActivity {
  id:          string
  userName:    string
  examTitle:   string
  score:       string
  submittedAt: string | null
}

interface SubjectStats {
  id:        string
  name:      string
  topics:    number
  questions: number
  exams:     number
}

interface DashboardData {
  stats:             DashboardStats
  bundleStats:       BundleStats
  purchaseBreakdown: PurchaseBreakdown
  recentActivity:    RecentActivity[]
  subjectStats:      SubjectStats[]
}

// ── Component ─────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [data, setData]         = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => { fetchDashboardData() }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch('/api/admin/dashboard')
      if (!res.ok) throw new Error('Failed to fetch dashboard data')
      setData(await res.json())
    } catch (err) {
      console.error('Error fetching dashboard:', err)
      setError('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Failed to load dashboard'}</p>
      </div>
    )
  }

  // ── Stat card definitions ──────────────────────────────────────────────

  const topStats = [
    {
      title:  'Total Questions',
      value:  data.stats.totalQuestions.count.toLocaleString(),
      icon:   FileQuestion,
      change: data.stats.totalQuestions.change,
      color:  'text-blue-600',
      bg:     'bg-blue-100',
    },
    {
      title:  'Active Exams',
      value:  data.stats.activeExams.count.toString(),
      icon:   BookOpen,
      change: data.stats.activeExams.change,
      color:  'text-green-600',
      bg:     'bg-green-100',
    },
    {
      title:  'Total Users',
      value:  data.stats.totalUsers.count.toLocaleString(),
      icon:   Users,
      change: data.stats.totalUsers.change,
      color:  'text-purple-600',
      bg:     'bg-purple-100',
    },
    {
      title:  'Revenue',
      value:  data.stats.revenue.formatted,
      icon:   IndianRupee,
      change: data.stats.revenue.change,
      color:  'text-yellow-600',
      bg:     'bg-yellow-100',
    },
  ]

  const purchaseStats = [
    {
      title:  'Total Purchases',
      value:  data.purchaseBreakdown.total.toLocaleString(),
      icon:   ShoppingBag,
      change: `${data.purchaseBreakdown.examPurchases} exams · ${data.purchaseBreakdown.bundlePurchases} bundles`,
      color:  'text-indigo-600',
      bg:     'bg-indigo-100',
    },
    {
      title:  'Active Bundles',
      value:  `${data.bundleStats.active} / ${data.bundleStats.total}`,
      icon:   Package,
      change: `${data.bundleStats.totalPurchases} bundle purchases`,
      color:  'text-pink-600',
      bg:     'bg-pink-100',
    },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard 🔧</h1>
        <p className="mt-2 text-gray-600">Platform overview and management</p>
      </div>

      {/* Top 4 stat cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {topStats.map(stat => (
          <Card key={stat.title} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Purchase / Bundle row */}
      <div className="grid gap-6 sm:grid-cols-2 mt-6">
        {purchaseStats.map(stat => (
          <Card key={stat.title} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom grid */}
      <div className="grid gap-6 mt-8 lg:grid-cols-2">

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
            ) : (
              <div className="space-y-4">
                {data.recentActivity.slice(0, 5).map(activity => (
                  <div key={activity.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.userName}</p>
                      <p className="text-xs text-muted-foreground">{activity.examTitle}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${
                        activity.score === 'N/A'
                          ? 'text-gray-400'
                          : parseFloat(activity.score) >= 50
                          ? 'text-green-600'
                          : 'text-red-500'
                      }`}>
                        {activity.score}
                      </p>
                      {activity.submittedAt && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.submittedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subject Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Subject Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            {data.subjectStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No subjects created yet</p>
            ) : (
              <div className="space-y-4">
                {data.subjectStats.map(subject => (
                  <div key={subject.id} className="border-b pb-3 last:border-0">
                    <h4 className="font-semibold mb-2">{subject.name}</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Topics</p>
                        <p className="font-medium">{subject.topics}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Questions</p>
                        <p className="font-medium">{subject.questions}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Exams</p>
                        <p className="font-medium">{subject.exams}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}