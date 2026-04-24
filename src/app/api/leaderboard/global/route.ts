// src/app/api/leaderboard/global/route.ts
//
// Global leaderboard is deferred intentionally.
//
// Reason: A meaningful global rank requires a normalized scoring
// formula that accounts for:
// - Different exams having different total marks
// - Number of exams attempted (unfair to compare 1 vs 10 exams)
// - Subject difficulty variance
//
// This will be designed and implemented as a separate feature
// once per-exam leaderboard is stable and battle-tested.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-error'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    // Current user's exam-level stats
    // So the "Coming Soon" page can still show
    // something meaningful to the student
    let userStats = null

    if (session?.user?.id) {
      const [entries, totalExams] = await Promise.all([
        prisma.leaderboardEntry.findMany({
          where:   { userId: session.user.id },
          select:  {
            rank:       true,
            percentile: true,
            score:      true,
            examId:     true,
            exam: {
              select: {
                title: true,
                slug:  true,
              }
            }
          },
          orderBy: { rank: 'asc' },
          take:    5, // Top 5 best performing exams
        }),
        prisma.leaderboardEntry.count({
          where: { userId: session.user.id }
        })
      ])

      if (entries.length > 0) {
        const avgPercentile = entries.reduce(
          (sum, e) => sum + e.percentile, 0
        ) / entries.length

        userStats = {
          totalExamsOnLeaderboard: totalExams,
          avgPercentile:           parseFloat(avgPercentile.toFixed(2)),
          bestPerformances:        entries.map(e => ({
            examId:     e.examId,
            examTitle:  e.exam.title,
            examSlug:   e.exam.slug,
            rank:       e.rank,
            percentile: e.percentile,
            score:      e.score,
          }))
        }
      }
    }

    return NextResponse.json({
      comingSoon:  true,
      message:     'Global leaderboard is coming soon. Per-exam leaderboards are live!',
      userStats,
      lastUpdated: new Date().toISOString(),
    })

  } catch (error) {
    return handleApiError(error)
  }
}