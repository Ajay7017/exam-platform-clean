// src/lib/utils/rank-calculator.ts
//
// NOTE: The worker in src/workers/exam-sync-worker.ts is the
// SOURCE OF TRUTH for rank and percentile calculation.
// It runs every 2 minutes via setInterval and handles all
// official attempts automatically.
//
// This file exists for:
// 1. Manual/admin triggered rank recalculation
// 2. Backfill scripts
// 3. The backfill-ranks.ts script
//
// DO NOT call these functions in the hot path (submit flow).
// The worker handles that asynchronously.

import { prisma } from '@/lib/prisma'

/**
 * Recalculate ranks and percentiles for ALL official attempts
 * in a specific exam. Safe to call multiple times (idempotent).
 *
 * Use cases:
 * - Admin manually triggers recalculation
 * - After bulk import of attempts
 * - Backfill script
 */
export async function recalculateExamRanks(examId: string): Promise<{
  success: boolean
  totalProcessed: number
  examId: string
}> {
  try {
    const attempts = await prisma.attempt.findMany({
      where: {
        examId,
        status:     'graded',
        isOfficial: true,
      },
      select: {
        id:           true,
        userId:       true,
        score:        true,
        timeSpentSec: true,
        percentage:   true,
        submittedAt:  true,
      },
      orderBy: [
        { score:        'desc' },
        { timeSpentSec: 'asc'  },
      ],
    })

    if (attempts.length === 0) {
      return { success: true, totalProcessed: 0, examId }
    }

    const total   = attempts.length
    const updates = attempts.map((attempt, index) => {
      const rank       = index + 1
      const percentile = total > 1
        ? parseFloat((((total - rank) / total) * 100).toFixed(2))
        : 0
      return { ...attempt, rank, percentile }
    })

    await prisma.$transaction(async (tx) => {
      // Bulk update attempts
      const values = updates
        .map(u => `('${u.id}'::text, ${u.rank}::int, ${u.percentile}::float8)`)
        .join(', ')

      await tx.$executeRawUnsafe(`
        UPDATE "Attempt" AS a
        SET rank = v.rank::int, percentile = v.percentile::float8
        FROM (VALUES ${values}) AS v(id, rank, percentile)
        WHERE a.id = v.id
      `)

      // Upsert leaderboard entries
      for (const u of updates) {
        await tx.leaderboardEntry.upsert({
          where: {
            examId_userId: { examId, userId: u.userId }
          },
          create: {
            examId,
            userId:      u.userId,
            attemptId:   u.id,
            score:       u.score       ?? 0,
            percentage:  u.percentage  ?? 0,
            percentile:  u.percentile,
            rank:        u.rank,
            timeTaken:   u.timeSpentSec ?? 0,
            submittedAt: u.submittedAt  ?? new Date(),
          },
          update: {
            score:       u.score       ?? 0,
            percentage:  u.percentage  ?? 0,
            percentile:  u.percentile,
            rank:        u.rank,
            timeTaken:   u.timeSpentSec ?? 0,
            submittedAt: u.submittedAt  ?? new Date(),
          }
        })
      }
    })

    console.log(`[RankCalc] Exam ${examId} — ${total} attempts ranked`)
    return { success: true, totalProcessed: total, examId }

  } catch (error) {
    console.error('[RankCalc] Error:', error)
    throw error
  }
}

/**
 * Get a user's current rank and percentile for a specific exam.
 * Reads from LeaderboardEntry (already calculated — no computation).
 */
export async function getUserExamRank(
  userId: string,
  examId: string
): Promise<{
  rank:              number | null
  percentile:        number | null
  totalParticipants: number
  score:             number | null
} | null> {
  try {
    const [entry, total] = await Promise.all([
      prisma.leaderboardEntry.findUnique({
        where: { examId_userId: { examId, userId } },
        select: {
          rank:       true,
          percentile: true,
          score:      true,
        }
      }),
      prisma.leaderboardEntry.count({ where: { examId } })
    ])

    if (!entry) return null

    return {
      rank:              entry.rank,
      percentile:        entry.percentile,
      score:             entry.score,
      totalParticipants: total,
    }

  } catch (error) {
    console.error('[RankCalc] getUserExamRank error:', error)
    return null
  }
}