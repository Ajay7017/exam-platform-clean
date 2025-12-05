// src/app/api/admin/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get current month start and previous month start
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last6MonthsStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // 1. Total Users and Growth
    const [totalUsers, currentMonthUsers, previousMonthUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { createdAt: { gte: currentMonthStart } },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: previousMonthStart,
            lt: currentMonthStart,
          },
        },
      }),
    ]);

    const userGrowth = previousMonthUsers > 0 
      ? ((currentMonthUsers - previousMonthUsers) / previousMonthUsers) * 100 
      : 100;

    // 2. Total Questions and Growth
    const [totalQuestions, currentMonthQuestions, previousMonthQuestions] = await Promise.all([
      prisma.question.count(),
      prisma.question.count({
        where: { createdAt: { gte: currentMonthStart } },
      }),
      prisma.question.count({
        where: {
          createdAt: {
            gte: previousMonthStart,
            lt: currentMonthStart,
          },
        },
      }),
    ]);

    const questionGrowth = previousMonthQuestions > 0
      ? ((currentMonthQuestions - previousMonthQuestions) / previousMonthQuestions) * 100
      : 100;

    // 3. Total Attempts and Growth
    const [totalAttempts, currentMonthAttempts, previousMonthAttempts] = await Promise.all([
      prisma.attempt.count(),
      prisma.attempt.count({
        where: { createdAt: { gte: currentMonthStart } },
      }),
      prisma.attempt.count({
        where: {
          createdAt: {
            gte: previousMonthStart,
            lt: currentMonthStart,
          },
        },
      }),
    ]);

    const attemptGrowth = previousMonthAttempts > 0
      ? ((currentMonthAttempts - previousMonthAttempts) / previousMonthAttempts) * 100
      : 100;

    // 4. Revenue and Growth
    const [currentMonthRevenue, previousMonthRevenue] = await Promise.all([
      prisma.purchase.aggregate({
        where: {
          status: 'completed',
          purchasedAt: { gte: currentMonthStart },
        },
        _sum: { price: true },
      }),
      prisma.purchase.aggregate({
        where: {
          status: 'completed',
          purchasedAt: {
            gte: previousMonthStart,
            lt: currentMonthStart,
          },
        },
        _sum: { price: true },
      }),
    ]);

    const totalRevenue = currentMonthRevenue._sum.price || 0;
    const prevRevenue = previousMonthRevenue._sum.price || 0;
    const revenueGrowth = prevRevenue > 0 
      ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 
      : 100;

    // 5. User Signups (Last 30 Days) - Group by 5-day intervals
    const userSignups = await prisma.user.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: last30Days } },
      _count: true,
    });

    // Group into 5-day intervals
    const signupData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(last30Days.getTime() + i * 5 * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 5 * 24 * 60 * 60 * 1000);
      const count = userSignups.filter(
        (s) => s.createdAt >= date && s.createdAt < nextDate
      ).length;
      return {
        date: `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`,
        users: count,
      };
    });

    // 6. Exam Attempts (Last 7 Days)
    const attemptsByDay = await prisma.attempt.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: last7Days } },
      _count: true,
    });

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const examAttemptsData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(last7Days.getTime() + i * 24 * 60 * 60 * 1000);
      const count = attemptsByDay.filter(
        (a) => new Date(a.createdAt).toDateString() === date.toDateString()
      ).length;
      return {
        day: days[date.getDay()],
        attempts: count,
      };
    });

    // 7. Subject Distribution (Questions per subject)
    // Fetch all subjects with their nested topic->question counts
    const allSubjects = await prisma.subject.findMany({
      select: {
        id: true,
        name: true,
        topics: {
          select: {
            _count: {
              select: { questions: true },
            },
          },
        },
      },
    });

    // Calculate total questions per subject, sort by count desc, and take top 5
    const subjectDistribution = allSubjects
      .map((subject) => {
        // Sum the question counts from all topics belonging to this subject
        const totalQuestions = subject.topics.reduce(
          (sum, topic) => sum + topic._count.questions,
          0
        );
        return {
          name: subject.name,
          value: totalQuestions,
        };
      })
      .sort((a, b) => b.value - a.value) // Sort Highest to Lowest
      .slice(0, 5); // Take top 5

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const subjectData = subjectDistribution.map((subject, idx) => ({
      name: subject.name,
      value: subject.value,
      color: colors[idx % colors.length],
    }));

    // 8. Revenue Trend (Last 6 Months)
    const revenueByMonth = await prisma.purchase.groupBy({
      by: ['purchasedAt'],
      where: {
        status: 'completed',
        purchasedAt: { gte: last6MonthsStart },
      },
      _sum: { price: true },
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueData = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(last6MonthsStart.getTime());
      date.setMonth(date.getMonth() + i);
      const monthRevenue = revenueByMonth
        .filter((r) => {
          const rDate = new Date(r.purchasedAt);
          return rDate.getMonth() === date.getMonth() && rDate.getFullYear() === date.getFullYear();
        })
        .reduce((sum, r) => sum + (r._sum.price || 0), 0);
      
      return {
        month: months[date.getMonth()],
        revenue: monthRevenue / 100, // Convert paise to rupees
      };
    });

    // 9. Top Performing Exams
    const topExams = await prisma.exam.findMany({
      where: {
        isPublished: true,
        createdAt: { gte: currentMonthStart },
      },
      select: {
        id: true,
        title: true,
        totalAttempts: true,
        _count: {
          select: { attempts: true },
        },
      },
      orderBy: {
        attempts: { _count: 'desc' },
      },
      take: 5,
    });

    // Calculate trend (comparing with previous attempts)
    const topPerformers = await Promise.all(
      topExams.map(async (exam) => {
        const prevAttempts = await prisma.attempt.count({
          where: {
            examId: exam.id,
            createdAt: {
              gte: previousMonthStart,
              lt: currentMonthStart,
            },
          },
        });

        const currentAttempts = exam._count.attempts;
        const trend = prevAttempts > 0 
          ? `+${Math.round(((currentAttempts - prevAttempts) / prevAttempts) * 100)}%`
          : '+100%';

        return {
          name: exam.title,
          attempts: currentAttempts,
          trend,
        };
      })
    );

    return NextResponse.json({
      metrics: {
        totalUsers,
        userGrowth: Math.round(userGrowth * 10) / 10,
        totalQuestions,
        questionGrowth: Math.round(questionGrowth * 10) / 10,
        totalAttempts,
        attemptGrowth: Math.round(attemptGrowth * 10) / 10,
        revenue: totalRevenue / 100, // Convert paise to rupees
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      },
      charts: {
        userSignups: signupData,
        examAttempts: examAttemptsData,
        subjectDistribution: subjectData,
        revenue: revenueData,
      },
      topPerformers,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}