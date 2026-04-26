// src/app/api/admin/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-error'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // ── Date boundaries ───────────────────────────────────────────────────
    const now = new Date()

    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const oneWeekAgo = new Date(now)
    oneWeekAgo.setDate(now.getDate() - 7)

    // ── 1. Questions ──────────────────────────────────────────────────────
    const [totalQuestions, questionsToday] = await Promise.all([
      prisma.question.count({ where: { isActive: true } }),
      prisma.question.count({
        where: { isActive: true, createdAt: { gte: todayStart } },
      }),
    ])

    // ── 2. Exams ──────────────────────────────────────────────────────────
    const [activeExams, draftExams] = await Promise.all([
      prisma.exam.count({ where: { isPublished: true } }),
      prisma.exam.count({ where: { isPublished: false } }),
    ])

    // ── 3. Users ──────────────────────────────────────────────────────────
    const [totalUsers, usersThisWeek] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: oneWeekAgo } } }),
    ])

    // ── 4. Revenue — source of truth is Purchase.price (status: 'active') ─
    //    The Payment table only tracks Razorpay gateway records and can miss
    //    free / manually-activated purchases. Purchase.price is always set.
    const [totalRevenueResult, lastMonthRevenueResult] = await Promise.all([
      prisma.purchase.aggregate({
        where: { status: 'active' },
        _sum: { price: true },
      }),
      prisma.purchase.aggregate({
        where: {
          status: 'active',
          purchasedAt: { gte: lastMonthStart, lt: thisMonthStart },
        },
        _sum: { price: true },
      }),
    ])

    const totalRevenuePaise    = totalRevenueResult._sum.price    || 0
    const lastMonthRevenuePaise = lastMonthRevenueResult._sum.price || 0

    const totalRevenueInRupees  = totalRevenuePaise    / 100
    const lastMonthRevenueRupees = lastMonthRevenuePaise / 100

    const revenueChange =
      lastMonthRevenueRupees > 0
        ? ((totalRevenueInRupees - lastMonthRevenueRupees) / lastMonthRevenueRupees) * 100
        : totalRevenueInRupees > 0
        ? 100
        : 0

    // ── 5. Bundle stats ───────────────────────────────────────────────────
    const [totalBundles, activeBundles, totalBundlePurchases] = await Promise.all([
      prisma.bundle.count(),
      prisma.bundle.count({ where: { isActive: true } }),
      prisma.purchase.count({ where: { status: 'active', type: 'bundle' } }),
    ])

    // ── 6. Purchase breakdown ─────────────────────────────────────────────
    const [examPurchases, bundlePurchasesTotal] = await Promise.all([
      prisma.purchase.count({ where: { status: 'active', type: 'single_exam' } }),
      prisma.purchase.count({ where: { status: 'active', type: 'bundle' } }),
    ])

    // ── 7. Recent activity (graded attempts) ──────────────────────────────
    const recentAttempts = await prisma.attempt.findMany({
      where: { status: 'graded' },
      include: {
        user: { select: { name: true, email: true } },
        exam: { select: { title: true } },
      },
      orderBy: { submittedAt: 'desc' },
      take: 10,
    })

    const recentActivity = recentAttempts.map(attempt => ({
      id:          attempt.id,
      userName:    attempt.user.name || attempt.user.email,
      examTitle:   attempt.exam.title,
      score:       attempt.percentage != null
                     ? `${attempt.percentage.toFixed(1)}%`
                     : 'N/A',
      submittedAt: attempt.submittedAt?.toISOString() || null,
    }))

    // ── 8. Subject statistics ─────────────────────────────────────────────
    const subjects = await prisma.subject.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { topics: true, exams: true } },
        topics: {
          include: { _count: { select: { questions: true } } },
        },
      },
    })

    const subjectStats = subjects.map(subject => ({
      id:        subject.id,
      name:      subject.name,
      topics:    subject._count.topics,
      questions: subject.topics.reduce((sum, t) => sum + t._count.questions, 0),
      exams:     subject._count.exams,
    }))

    // ── Helpers ───────────────────────────────────────────────────────────
    const formatRevenue = (amount: number) => {
      if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
      if (amount >= 1000)   return `₹${(amount / 1000).toFixed(1)}K`
      return `₹${amount.toFixed(0)}`
    }

    // ── Response ──────────────────────────────────────────────────────────
    return NextResponse.json({
      stats: {
        totalQuestions: {
          count:  totalQuestions,
          change: questionsToday > 0 ? `+${questionsToday} today` : 'No additions today',
        },
        activeExams: {
          count:  activeExams,
          drafts: draftExams,
          change: draftExams > 0 ? `${draftExams} drafts` : 'No drafts',
        },
        totalUsers: {
          count:  totalUsers,
          change: usersThisWeek > 0 ? `+${usersThisWeek} this week` : 'No new users this week',
        },
        revenue: {
          total:     totalRevenueInRupees,
          formatted: formatRevenue(totalRevenueInRupees),
          change:
            revenueChange >= 0
              ? `+${revenueChange.toFixed(1)}% vs last month`
              : `${revenueChange.toFixed(1)}% vs last month`,
        },
      },
      bundleStats: {
        total:          totalBundles,
        active:         activeBundles,
        totalPurchases: totalBundlePurchases,
      },
      purchaseBreakdown: {
        examPurchases,
        bundlePurchases: bundlePurchasesTotal,
        total:           examPurchases + bundlePurchasesTotal,
      },
      recentActivity,
      subjectStats,
    })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    return handleApiError(error)
  }
}