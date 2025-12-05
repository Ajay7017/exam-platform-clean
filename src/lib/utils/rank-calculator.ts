// src/lib/utils/rank-calculator.ts

import { prisma } from '@/lib/prisma'

/**
 * Calculate and update rank for a specific exam attempt
 * This should be called after an exam is submitted
 */
export async function calculateAndUpdateExamRank(attemptId: string) {
  try {
    // 1. Get the attempt details
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        userId: true,
        examId: true,
        score: true,
        percentage: true,
        timeSpentSec: true,
        submittedAt: true
      }
    })

    if (!attempt || !attempt.submittedAt) {
      throw new Error('Attempt not found or not submitted')
    }

    // 2. Get all completed attempts for this exam, sorted by:
    //    - Score (descending)
    //    - Time taken (ascending) as tiebreaker
    const allAttempts = await prisma.attempt.findMany({
      where: {
        examId: attempt.examId,
        status: 'completed',
        submittedAt: { not: null }
      },
      select: {
        id: true,
        userId: true,
        score: true,
        timeSpentSec: true
      },
      orderBy: [
        { score: 'desc' },
        { timeSpentSec: 'asc' }
      ]
    })

    // 3. Calculate ranks
    let currentRank = 1
    let lastScore = null
    let lastTime = null
    let sameRankCount = 0

    const rankedAttempts = allAttempts.map((att, index) => {
      // If score and time are the same as previous, keep same rank
      if (lastScore === att.score && lastTime === att.timeSpentSec) {
        sameRankCount++
      } else {
        currentRank = index + 1
        sameRankCount = 0
      }

      lastScore = att.score
      lastTime = att.timeSpentSec

      return {
        attemptId: att.id,
        userId: att.userId,
        rank: currentRank
      }
    })

    // 4. Update all attempts with their ranks
    const updatePromises = rankedAttempts.map(({ attemptId, rank }) =>
      prisma.attempt.update({
        where: { id: attemptId },
        data: { rank }
      })
    )

    await Promise.all(updatePromises)

    // 5. Calculate percentile for current attempt
    const currentAttemptRank = rankedAttempts.find(r => r.attemptId === attemptId)
    const totalAttempts = allAttempts.length

    if (currentAttemptRank) {
      const percentile = totalAttempts > 1
        ? ((totalAttempts - currentAttemptRank.rank) / (totalAttempts - 1)) * 100
        : 100

      await prisma.attempt.update({
        where: { id: attemptId },
        data: { percentile }
      })
    }

    // 6. Update or create leaderboard entry
    await updateLeaderboardEntry(attempt.userId, attempt.examId, attemptId)

    return {
      success: true,
      rank: currentAttemptRank?.rank,
      totalAttempts
    }

  } catch (error) {
    console.error('Error calculating rank:', error)
    throw error
  }
}

/**
 * Update leaderboard entry for a user's best attempt in an exam
 */
async function updateLeaderboardEntry(
  userId: string,
  examId: string,
  attemptId: string
) {
  try {
    // Get the attempt details
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: {
        score: true,
        percentage: true,
        timeSpentSec: true,
        submittedAt: true,
        rank: true
      }
    })

    if (!attempt || !attempt.submittedAt) {
      return
    }

    // Check if user already has a leaderboard entry for this exam
    const existingEntry = await prisma.leaderboardEntry.findUnique({
      where: {
        examId_userId: {
          examId,
          userId
        }
      }
    })

    // Only update if this is the first attempt OR if the new score is better
    const shouldUpdate = !existingEntry || 
      (attempt.score || 0) > (existingEntry.score || 0)

    if (shouldUpdate) {
      await prisma.leaderboardEntry.upsert({
        where: {
          examId_userId: {
            examId,
            userId
          }
        },
        create: {
          examId,
          userId,
          attemptId,
          score: attempt.score || 0,
          percentage: attempt.percentage || 0,
          rank: attempt.rank || 999999,
          timeTaken: attempt.timeSpentSec || 0,
          submittedAt: attempt.submittedAt
        },
        update: {
          attemptId,
          score: attempt.score || 0,
          percentage: attempt.percentage || 0,
          rank: attempt.rank || 999999,
          timeTaken: attempt.timeSpentSec || 0,
          submittedAt: attempt.submittedAt
        }
      })

      // After updating leaderboard, recalculate leaderboard ranks
      await recalculateLeaderboardRanks(examId)
    }
  } catch (error) {
    console.error('Error updating leaderboard entry:', error)
    throw error
  }
}

/**
 * Recalculate ranks in the leaderboard for an exam
 * This ensures leaderboard ranks are consistent
 */
async function recalculateLeaderboardRanks(examId: string) {
  try {
    // Get all leaderboard entries for this exam
    const entries = await prisma.leaderboardEntry.findMany({
      where: { examId },
      orderBy: [
        { score: 'desc' },
        { timeTaken: 'asc' }
      ]
    })

    // Update ranks
    const updates = entries.map((entry, index) =>
      prisma.leaderboardEntry.update({
        where: { id: entry.id },
        data: { rank: index + 1 }
      })
    )

    await Promise.all(updates)
  } catch (error) {
    console.error('Error recalculating leaderboard ranks:', error)
  }
}

/**
 * Calculate global rank for a user based on cumulative score
 */
export async function calculateGlobalRank(userId: string): Promise<number | null> {
  try {
    // Get all users' cumulative scores
    const allUserScores = await prisma.leaderboardEntry.groupBy({
      by: ['userId'],
      _sum: {
        score: true
      }
    })

    // Sort by total score
    const sortedScores = allUserScores
      .map(u => ({
        userId: u.userId,
        totalScore: u._sum.score || 0
      }))
      .sort((a, b) => b.totalScore - a.totalScore)

    // Find user's position
    const userIndex = sortedScores.findIndex(u => u.userId === userId)
    return userIndex >= 0 ? userIndex + 1 : null

  } catch (error) {
    console.error('Error calculating global rank:', error)
    return null
  }
}