// src/app/(admin)/admin/analytics/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Users, FileQuestion, BookOpen, DollarSign } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface AnalyticsData {
  metrics: {
    totalUsers: number;
    userGrowth: number;
    totalQuestions: number;
    questionGrowth: number;
    totalAttempts: number;
    attemptGrowth: number;
    revenue: number;
    revenueGrowth: number;
  };
  charts: {
    userSignups: Array<{ date: string; users: number }>;
    examAttempts: Array<{ day: string; attempts: number }>;
    subjectDistribution: Array<{ name: string; value: number; color: string }>;
    revenue: Array<{ month: string; revenue: number }>;
  };
  topPerformers: Array<{ name: string; attempts: number; trend: string }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/analytics');
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    return `₹${(amount / 1000).toFixed(1)}K`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-2 text-gray-600">Loading analytics data...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-24 bg-gray-100 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-2 text-red-600">Failed to load analytics data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Platform insights and performance metrics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {data.metrics.totalUsers.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {data.metrics.userGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-success-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-error-500" />
                  )}
                  <span className={`text-sm font-medium ${
                    data.metrics.userGrowth >= 0 ? 'text-success-500' : 'text-error-500'
                  }`}>
                    {data.metrics.userGrowth >= 0 ? '+' : ''}{data.metrics.userGrowth}%
                  </span>
                  <span className="text-xs text-gray-500">vs last month</span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
                <Users className="h-6 w-6 text-primary-600" />
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
                  {data.metrics.totalQuestions.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {data.metrics.questionGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-success-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-error-500" />
                  )}
                  <span className={`text-sm font-medium ${
                    data.metrics.questionGrowth >= 0 ? 'text-success-500' : 'text-error-500'
                  }`}>
                    {data.metrics.questionGrowth >= 0 ? '+' : ''}{data.metrics.questionGrowth}%
                  </span>
                  <span className="text-xs text-gray-500">vs last month</span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-100">
                <FileQuestion className="h-6 w-6 text-success-600" />
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
                  {data.metrics.totalAttempts.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {data.metrics.attemptGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-success-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-error-500" />
                  )}
                  <span className={`text-sm font-medium ${
                    data.metrics.attemptGrowth >= 0 ? 'text-success-500' : 'text-error-500'
                  }`}>
                    {data.metrics.attemptGrowth >= 0 ? '+' : ''}{data.metrics.attemptGrowth}%
                  </span>
                  <span className="text-xs text-gray-500">vs last month</span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning-100">
                <BookOpen className="h-6 w-6 text-warning-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(data.metrics.revenue)}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {data.metrics.revenueGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-success-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-error-500" />
                  )}
                  <span className={`text-sm font-medium ${
                    data.metrics.revenueGrowth >= 0 ? 'text-success-500' : 'text-error-500'
                  }`}>
                    {data.metrics.revenueGrowth >= 0 ? '+' : ''}{data.metrics.revenueGrowth}%
                  </span>
                  <span className="text-xs text-gray-500">vs last month</span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-100">
                <DollarSign className="h-6 w-6 text-error-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Signups Chart */}
        <Card>
          <CardHeader>
            <CardTitle>User Signups</CardTitle>
            <CardDescription>Last 30 days trend</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.charts.userSignups}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Exam Attempts Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Exam Attempts</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.charts.examAttempts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="attempts" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subject Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Question Distribution by Subject</CardTitle>
            <CardDescription>Total questions across subjects</CardDescription>
          </CardHeader>
          <CardContent>
            {data.charts.subjectDistribution.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.charts.subjectDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(props) => {
                        const name = props.name ?? "Unknown";
                        const percent = typeof props.percent === "number" ? props.percent : 0;
                        return `${name}: ${(percent * 100).toFixed(0)}%`;
                      }}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data.charts.subjectDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {data.charts.subjectDistribution.map((subject) => (
                    <div key={subject.name} className="text-center">
                      <div
                        className="h-3 w-3 rounded-full mx-auto mb-1"
                        style={{ backgroundColor: subject.color }}
                      />
                      <div className="text-xs text-gray-600">{subject.name}</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {subject.value}
                      </div>
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

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.charts.revenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => `₹${(value / 1000).toFixed(1)}K`}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Exams</CardTitle>
          <CardDescription>Most attempted exams this month</CardDescription>
        </CardHeader>
        <CardContent>
          {data.topPerformers.length > 0 ? (
            <div className="space-y-4">
              {data.topPerformers.map((exam, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{exam.name}</div>
                      <div className="text-sm text-gray-500">
                        {exam.attempts} attempts
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {exam.trend.startsWith('+') ? (
                      <TrendingUp className="h-4 w-4 text-success-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-error-500" />
                    )}
                    <span className={`text-sm font-medium ${
                      exam.trend.startsWith('+') ? 'text-success-500' : 'text-error-500'
                    }`}>
                      {exam.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No exam data available for this month
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}