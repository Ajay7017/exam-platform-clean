// src/app/(admin)/admin/analytics/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TrendingUp, TrendingDown, Users, FileQuestion,
  BookOpen, IndianRupee, Package, ShoppingBag,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

// ── Types ─────────────────────────────────────────────────────────────────

interface AnalyticsData {
  metrics: {
    totalUsers:       number
    userGrowth:       number
    totalQuestions:   number
    questionGrowth:   number
    totalAttempts:    number
    attemptGrowth:    number
    revenue:          number
    revenueGrowth:    number
    totalBundles:     number
    activeBundles:    number
    bundlePurchases:  number
    examPurchases:    number
    totalPurchases:   number
  }
  charts: {
    userSignups:         Array<{ date: string; users: number }>
    examAttempts:        Array<{ day: string; attempts: number }>
    subjectDistribution: Array<{ name: string; value: number; color: string }>
    revenue:             Array<{ month: string; revenue: number }>
  }
  topPerformers: Array<{ name: string; attempts: number; trend: string }>
}

// ── Helpers ───────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000)   return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${amount.toFixed(0)}`
}

function GrowthBadge({ value }: { value: number }) {
  const positive = value >= 0
  return (
    <div className="flex items-center gap-1 mt-2">
      {positive
        ? <TrendingUp  className="h-4 w-4 text-green-500" />
        : <TrendingDown className="h-4 w-4 text-red-500" />}
      <span className={`text-sm font-medium ${positive ? 'text-green-500' : 'text-red-500'}`}>
        {positive ? '+' : ''}{value}%
      </span>
      <span className="text-xs text-gray-500">vs last month</span>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData]         = useState<AnalyticsData | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-2 text-gray-600">Loading analytics data…</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => (
            <Card key={i}><CardContent className="pt-6">
              <div className="h-24 bg-gray-100 animate-pulse rounded" />
            </CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="mt-2 text-red-600">Failed to load analytics data</p>
      </div>
    )
  }

  const { metrics, charts, topPerformers } = data

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="mt-2 text-gray-600">Platform insights and performance metrics</p>
      </div>

      {/* ── Row 1: Core metrics ─────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {metrics.totalUsers.toLocaleString()}
                </p>
                <GrowthBadge value={metrics.userGrowth} />
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Questions</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {metrics.totalQuestions.toLocaleString()}
                </p>
                <GrowthBadge value={metrics.questionGrowth} />
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <FileQuestion className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Exam Attempts</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {metrics.totalAttempts.toLocaleString()}
                </p>
                <GrowthBadge value={metrics.attemptGrowth} />
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                <BookOpen className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Revenue (All-Time)</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(metrics.revenue)}
                </p>
                <GrowthBadge value={metrics.revenueGrowth} />
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                <IndianRupee className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ── Row 2: Purchase & Bundle metrics ────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Purchases</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {metrics.totalPurchases.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {metrics.examPurchases} exam · {metrics.bundlePurchases} bundle
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                <ShoppingBag className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Bundle Purchases</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {metrics.bundlePurchases.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {metrics.activeBundles} active bundles
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100">
                <Package className="h-6 w-6 text-pink-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Single Exam Purchases</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {metrics.examPurchases.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Individual exam sales</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100">
                <BookOpen className="h-6 w-6 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ── Row 3: Charts ────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* User Signups */}
        <Card>
          <CardHeader>
            <CardTitle>User Signups</CardTitle>
            <CardDescription>Last 30 days trend</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={charts.userSignups}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Exam Attempts */}
        <Card>
          <CardHeader>
            <CardTitle>Exam Attempts</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={charts.examAttempts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="attempts" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>

      {/* ── Row 4: Subject dist + Revenue trend ─────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Subject Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Question Distribution by Subject</CardTitle>
            <CardDescription>Top 5 subjects by question count</CardDescription>
          </CardHeader>
          <CardContent>
            {charts.subjectDistribution.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={charts.subjectDistribution}
                      cx="50%" cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      dataKey="value"
                    >
                      {charts.subjectDistribution.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {charts.subjectDistribution.map(s => (
                    <div key={s.name} className="text-center">
                      <div className="h-3 w-3 rounded-full mx-auto mb-1"
                        style={{ backgroundColor: s.color }} />
                      <div className="text-xs text-gray-600">{s.name}</div>
                      <div className="text-sm font-semibold text-gray-900">{s.value}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No subject data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Last 6 months (₹)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={charts.revenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={v => `₹${v}`} />
                <Tooltip
                  formatter={(value: number) =>
                    value >= 1000
                      ? [`₹${(value / 1000).toFixed(1)}K`, 'Revenue']
                      : [`₹${value}`, 'Revenue']
                  }
                />
                <Legend />
                <Bar dataKey="revenue" fill="#f59e0b" name="Revenue (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>

      {/* ── Top Performers ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Exams</CardTitle>
          <CardDescription>Most attempted exams (all time)</CardDescription>
        </CardHeader>
        <CardContent>
          {topPerformers.length > 0 ? (
            <div className="space-y-4">
              {topPerformers.map((exam, idx) => (
                <div key={idx}
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{exam.name}</div>
                      <div className="text-sm text-gray-500">{exam.attempts} attempts</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {exam.trend.startsWith('+')
                      ? <TrendingUp  className="h-4 w-4 text-green-500" />
                      : <TrendingDown className="h-4 w-4 text-red-500" />}
                    <span className={`text-sm font-medium ${
                      exam.trend.startsWith('+') ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {exam.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No exam data available</div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}