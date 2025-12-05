// src/app/api/admin/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-error'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check if user is admin
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // 1. Get total questions count
    const totalQuestions = await prisma.question.count({
      where: { isActive: true }
    })

    // Get questions added today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const questionsToday = await prisma.question.count({
      where: {
        isActive: true,
        createdAt: {
          gte: today
        }
      }
    })

    // 2. Get active exams count
    const activeExams = await prisma.exam.count({
      where: { isPublished: true }
    })

    // Get draft exams
    const draftExams = await prisma.exam.count({
      where: { isPublished: false }
    })

    // 3. Get total users count
    const totalUsers = await prisma.user.count()

    // Get users registered this week
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    const usersThisWeek = await prisma.user.count({
      where: {
        createdAt: {
          gte: oneWeekAgo
        }
      }
    })

    // 4. Calculate revenue
    const revenueResult = await prisma.payment.aggregate({
      where: {
        status: 'paid'
      },
      _sum: {
        amount: true
      }
    })

    const totalRevenue = revenueResult._sum.amount || 0
    const totalRevenueInRupees = totalRevenue / 100 // Convert paise to rupees

    // Calculate last month's revenue for comparison
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    
    const lastMonthRevenueResult = await prisma.payment.aggregate({
      where: {
        status: 'paid',
        paidAt: {
          lt: oneWeekAgo
        }
      },
      _sum: {
        amount: true
      }
    })

    const lastMonthRevenue = (lastMonthRevenueResult._sum.amount || 0) / 100
    const revenueChange = lastMonthRevenue > 0 
      ? ((totalRevenueInRupees - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0

    // 5. Get recent activity
    const recentAttempts = await prisma.attempt.findMany({
      where: {
        status: 'completed'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        exam: {
          select: {
            title: true
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      },
      take: 10
    })

    const recentActivity = recentAttempts.map(attempt => ({
      id: attempt.id,
      userName: attempt.user.name || attempt.user.email,
      examTitle: attempt.exam.title,
      score: attempt.percentage ? `${attempt.percentage.toFixed(1)}%` : 'N/A',
      submittedAt: attempt.submittedAt?.toISOString() || null
    }))

    // 6. Get subject-wise statistics
    const subjects = await prisma.subject.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            topics: true,
            exams: true
          }
        },
        topics: {
          include: {
            _count: {
              select: {
                questions: true
              }
            }
          }
        }
      }
    })

    const subjectStats = subjects.map(subject => {
      const totalQuestions = subject.topics.reduce(
        (sum, topic) => sum + topic._count.questions, 
        0
      )
      
      return {
        id: subject.id,
        name: subject.name,
        topics: subject._count.topics,
        questions: totalQuestions,
        exams: subject._count.exams
      }
    })

    // 7. Format revenue
    const formatRevenue = (amount: number) => {
      if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(1)}L`
      } else if (amount >= 1000) {
        return `₹${(amount / 1000).toFixed(1)}K`
      }
      return `₹${amount.toFixed(0)}`
    }

    return NextResponse.json({
      stats: {
        totalQuestions: {
          count: totalQuestions,
          change: questionsToday > 0 ? `+${questionsToday} today` : 'No additions today'
        },
        activeExams: {
          count: activeExams,
          drafts: draftExams,
          change: draftExams > 0 ? `${draftExams} drafts` : 'No drafts'
        },
        totalUsers: {
          count: totalUsers,
          change: usersThisWeek > 0 ? `+${usersThisWeek} this week` : 'No new users this week'
        },
        revenue: {
          total: totalRevenueInRupees,
          formatted: formatRevenue(totalRevenueInRupees),
          change: revenueChange >= 0 
            ? `+${revenueChange.toFixed(1)}% vs last month` 
            : `${revenueChange.toFixed(1)}% vs last month`
        }
      },
      recentActivity,
      subjectStats
    })

  } catch (error) {
    console.error('Admin dashboard error:', error)
    return handleApiError(error)
  }
}