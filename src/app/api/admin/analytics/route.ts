// src/app/api/admin/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // ── Date boundaries ───────────────────────────────────────────────────
    const now                = new Date()
    const currentMonthStart  = new Date(now.getFullYear(), now.getMonth(), 1)
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const last30Days         = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const last7Days          = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000)
    const last6MonthsStart   = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    // ── 1. Users ──────────────────────────────────────────────────────────
    const [totalUsers, currentMonthUsers, previousMonthUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: currentMonthStart } } }),
      prisma.user.count({
        where: { createdAt: { gte: previousMonthStart, lt: currentMonthStart } },
      }),
    ])

    const userGrowth =
      previousMonthUsers > 0
        ? ((currentMonthUsers - previousMonthUsers) / previousMonthUsers) * 100
        : currentMonthUsers > 0 ? 100 : 0

    // ── 2. Questions ──────────────────────────────────────────────────────
    const [totalQuestions, currentMonthQuestions, previousMonthQuestions] = await Promise.all([
      prisma.question.count(),
      prisma.question.count({ where: { createdAt: { gte: currentMonthStart } } }),
      prisma.question.count({
        where: { createdAt: { gte: previousMonthStart, lt: currentMonthStart } },
      }),
    ])

    const questionGrowth =
      previousMonthQuestions > 0
        ? ((currentMonthQuestions - previousMonthQuestions) / previousMonthQuestions) * 100
        : currentMonthQuestions > 0 ? 100 : 0

    // ── 3. Attempts ───────────────────────────────────────────────────────
    const [totalAttempts, currentMonthAttempts, previousMonthAttempts] = await Promise.all([
      prisma.attempt.count(),
      prisma.attempt.count({ where: { createdAt: { gte: currentMonthStart } } }),
      prisma.attempt.count({
        where: { createdAt: { gte: previousMonthStart, lt: currentMonthStart } },
      }),
    ])

    const attemptGrowth =
      previousMonthAttempts > 0
        ? ((currentMonthAttempts - previousMonthAttempts) / previousMonthAttempts) * 100
        : currentMonthAttempts > 0 ? 100 : 0

    // ── 4. Revenue ────────────────────────────────────────────────────────
    //    FIX: was querying Purchase with status:'graded' (an Attempt status).
    //    Correct Purchase status is 'active'.
    //    Also using ALL-TIME total for the metric card, not just current month.
    const [totalRevenueAll, currentMonthRevenue, previousMonthRevenue] = await Promise.all([
      prisma.purchase.aggregate({
        where: { status: 'active' },
        _sum: { price: true },
      }),
      prisma.purchase.aggregate({
        where: {
          status: 'active',
          purchasedAt: { gte: currentMonthStart },
        },
        _sum: { price: true },
      }),
      prisma.purchase.aggregate({
        where: {
          status: 'active',
          purchasedAt: { gte: previousMonthStart, lt: currentMonthStart },
        },
        _sum: { price: true },
      }),
    ])

    const totalRevenuePaise = totalRevenueAll._sum.price    || 0
    const currMonthPaise    = currentMonthRevenue._sum.price || 0
    const prevMonthPaise    = previousMonthRevenue._sum.price || 0

    const revenueGrowth =
      prevMonthPaise > 0
        ? ((currMonthPaise - prevMonthPaise) / prevMonthPaise) * 100
        : currMonthPaise > 0 ? 100 : 0

    // ── 5. Bundle stats ───────────────────────────────────────────────────
    const [totalBundles, activeBundles, bundlePurchases, examPurchases] = await Promise.all([
      prisma.bundle.count(),
      prisma.bundle.count({ where: { isActive: true } }),
      prisma.purchase.count({ where: { status: 'active', type: 'bundle' } }),
      prisma.purchase.count({ where: { status: 'active', type: 'single_exam' } }),
    ])

    // ── 6. User signup chart (last 30 days, 5-day buckets) ────────────────
    const userSignupsRaw = await prisma.user.findMany({
      where: { createdAt: { gte: last30Days } },
      select: { createdAt: true },
    })

    const signupData = Array.from({ length: 6 }, (_, i) => {
      const bucketStart = new Date(last30Days.getTime() + i * 5 * 24 * 60 * 60 * 1000)
      const bucketEnd   = new Date(bucketStart.getTime()     + 5 * 24 * 60 * 60 * 1000)
      const count = userSignupsRaw.filter(
        u => u.createdAt >= bucketStart && u.createdAt < bucketEnd
      ).length
      return {
        date:  `${bucketStart.getDate()} ${bucketStart.toLocaleString('default', { month: 'short' })}`,
        users: count,
      }
    })

    // ── 7. Exam attempts chart (last 7 days) ──────────────────────────────
    const attemptsRaw = await prisma.attempt.findMany({
      where: { createdAt: { gte: last7Days } },
      select: { createdAt: true },
    })

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const examAttemptsData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(last7Days.getTime() + i * 24 * 60 * 60 * 1000)
      const count = attemptsRaw.filter(
        a => new Date(a.createdAt).toDateString() === date.toDateString()
      ).length
      return { day: days[date.getDay()], attempts: count }
    })

    // ── 8. Subject distribution (questions per subject, top 5) ────────────
    const allSubjects = await prisma.subject.findMany({
      select: {
        name: true,
        topics: { select: { _count: { select: { questions: true } } } },
      },
    })

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
    const subjectData = allSubjects
      .map(s => ({
        name:  s.name,
        value: s.topics.reduce((sum, t) => sum + t._count.questions, 0),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((s, i) => ({ ...s, color: colors[i] }))

    // ── 9. Revenue trend (last 6 months) ──────────────────────────────────
    //    FIX: was using status:'graded'. Correct is status:'active'.
    const revenuePurchases = await prisma.purchase.findMany({
      where: {
        status: 'active',
        purchasedAt: { gte: last6MonthsStart },
      },
      select: { purchasedAt: true, price: true },
    })

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const revenueData = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(last6MonthsStart)
      d.setMonth(d.getMonth() + i)
      const monthRevenue = revenuePurchases
        .filter(p => {
          const pd = new Date(p.purchasedAt)
          return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear()
        })
        .reduce((sum, p) => sum + p.price, 0)
      return {
        month:   monthNames[d.getMonth()],
        revenue: monthRevenue / 100, // paise → rupees
      }
    })

    // ── 10. Top performing exams (this month, by attempts) ────────────────
    const topExams = await prisma.exam.findMany({
      where: { isPublished: true },
      select: {
        id:    true,
        title: true,
        _count: { select: { attempts: true } },
      },
      orderBy: { attempts: { _count: 'desc' } },
      take: 5,
    })

    const topPerformers = await Promise.all(
      topExams.map(async exam => {
        const prevAttempts = await prisma.attempt.count({
          where: {
            examId:    exam.id,
            createdAt: { gte: previousMonthStart, lt: currentMonthStart },
          },
        })
        const curr  = exam._count.attempts
        const trend =
          prevAttempts > 0
            ? `+${Math.round(((curr - prevAttempts) / prevAttempts) * 100)}%`
            : curr > 0 ? '+100%' : '0%'
        return { name: exam.title, attempts: curr, trend }
      })
    )

    // ── Response ──────────────────────────────────────────────────────────
    return NextResponse.json({
      metrics: {
        totalUsers,
        userGrowth:     Math.round(userGrowth     * 10) / 10,
        totalQuestions,
        questionGrowth: Math.round(questionGrowth * 10) / 10,
        totalAttempts,
        attemptGrowth:  Math.round(attemptGrowth  * 10) / 10,
        revenue:        totalRevenuePaise / 100,   // all-time, in rupees
        revenueGrowth:  Math.round(revenueGrowth  * 10) / 10,
        // Bundle metrics
        totalBundles,
        activeBundles,
        bundlePurchases,
        examPurchases,
        totalPurchases: bundlePurchases + examPurchases,
      },
      charts: {
        userSignups:         signupData,
        examAttempts:        examAttemptsData,
        subjectDistribution: subjectData,
        revenue:             revenueData,
      },
      topPerformers,
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}