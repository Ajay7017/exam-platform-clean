// src/app/api/student/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-error'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // 1. Get total exams taken (completed attempts)
    const totalExamsTaken = await prisma.attempt.count({
      where: {
        userId,
        status: 'completed'
      }
    })

    // 2. Get exams taken this week
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const examsThisWeek = await prisma.attempt.count({
      where: {
        userId,
        status: 'completed',
        submittedAt: {
          gte: oneWeekAgo
        }
      }
    })

    // 3. Calculate average score
    const completedAttempts = await prisma.attempt.findMany({
      where: {
        userId,
        status: 'completed',
        percentage: { not: null }
      },
      select: {
        percentage: true,
        submittedAt: true
      },
      orderBy: {
        submittedAt: 'desc'
      }
    })

    const avgScore = completedAttempts.length > 0
      ? completedAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / completedAttempts.length
      : 0

    // Calculate last week's average
    const lastWeekAttempts = completedAttempts.filter(a => 
      a.submittedAt && a.submittedAt >= oneWeekAgo
    )
    const lastWeekAvg = lastWeekAttempts.length > 0
      ? lastWeekAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / lastWeekAttempts.length
      : 0

    const scoreChange = avgScore - lastWeekAvg

    // 4. ✅ FIXED: Calculate GLOBAL rank based on cumulative score
    // Get all users' cumulative scores
    const allUserScores = await prisma.leaderboardEntry.groupBy({
      by: ['userId'],
      _sum: {
        score: true
      }
    })

    // Sort by cumulative score (descending)
    const sortedScores = allUserScores
      .map(u => ({
        userId: u.userId,
        totalScore: u._sum.score || 0
      }))
      .sort((a, b) => b.totalScore - a.totalScore)

    // Find current user's rank
    const userRankIndex = sortedScores.findIndex(u => u.userId === userId)
    const globalRank = userRankIndex >= 0 ? userRankIndex + 1 : null

    // Total participants (users who have completed at least one exam)
    const totalParticipants = sortedScores.length

    // 5. Calculate total time spent (in seconds)
    const timeSpentResult = await prisma.attempt.aggregate({
      where: {
        userId,
        status: 'completed'
      },
      _sum: {
        timeSpentSec: true
      }
    })

    const totalTimeSpentSec = timeSpentResult._sum.timeSpentSec || 0
    const totalTimeHours = Math.floor(totalTimeSpentSec / 3600)

    // Time spent this week
    const timeThisWeekResult = await prisma.attempt.aggregate({
      where: {
        userId,
        status: 'completed',
        submittedAt: {
          gte: oneWeekAgo
        }
      },
      _sum: {
        timeSpentSec: true
      }
    })

    const timeThisWeekSec = timeThisWeekResult._sum.timeSpentSec || 0
    const timeThisWeekHours = Math.floor(timeThisWeekSec / 3600)

    // 6. Get in-progress exams
    const inProgressAttempts = await prisma.attempt.findMany({
      where: {
        userId,
        status: 'in_progress',
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            slug: true,
            totalMarks: true
          }
        }
      },
      orderBy: {
        startedAt: 'desc'
      },
      take: 5
    })

    const continueExams = inProgressAttempts.map(attempt => {
      const answers = (attempt.answers as Record<string, any>) || {}
      const answeredCount = Object.keys(answers).filter(
        key => answers[key]?.selectedOption
      ).length

      const progressPercentage = attempt.totalQuestions > 0
        ? (answeredCount / attempt.totalQuestions) * 100
        : 0

      return {
        attemptId: attempt.id,
        examId: attempt.exam.id,
        examTitle: attempt.exam.title,
        examSlug: attempt.exam.slug,
        totalQuestions: attempt.totalQuestions,
        answeredCount,
        progressPercentage: Math.round(progressPercentage),
        startedAt: attempt.startedAt.toISOString()
      }
    })

    // 7. Get recent activity
    const recentAttempts = await prisma.attempt.findMany({
      where: {
        userId,
        status: 'completed'
      },
      include: {
        exam: {
          select: {
            title: true,
            slug: true
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      },
      take: 5
    })

    const recentActivity = recentAttempts.map(attempt => ({
      id: attempt.id,
      action: 'Completed',
      examTitle: attempt.exam.title,
      examSlug: attempt.exam.slug,
      score: attempt.percentage ? `${attempt.percentage.toFixed(1)}%` : 'N/A',
      submittedAt: attempt.submittedAt?.toISOString() || null
    }))

    return NextResponse.json({
      stats: {
        examsTaken: {
          total: totalExamsTaken,
          thisWeek: examsThisWeek
        },
        averageScore: {
          current: Math.round(avgScore),
          change: scoreChange.toFixed(1)
        },
        rank: {
          current: globalRank,
          totalParticipants
        },
        timeSpent: {
          totalHours: totalTimeHours,
          thisWeekHours: timeThisWeekHours
        }
      },
      continueExams,
      recentActivity
    })

  } catch (error) {
    return handleApiError(error)
  }
}