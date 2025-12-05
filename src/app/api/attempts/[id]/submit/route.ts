// src/app/api/attempts/[id]/submit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    const attemptId = params.id

    // 1. Get complete attempt data with all questions
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: {
            questions: {
              include: {
                question: {
                  include: {
                    options: true,
                    topic: {
                      select: { name: true }
                    }
                  }
                }
              },
              orderBy: { sequence: 'asc' }
            }
          }
        }
      }
    })

    if (!attempt) {
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      )
    }

    if (attempt.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    if (attempt.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Attempt already submitted' },
        { status: 400 }
      )
    }

    // 2. Calculate score (SERVER-SIDE ONLY!)
    const userAnswers = (attempt.answers as Record<string, any>) || {}
    
    let score = 0
    let correctCount = 0
    let wrongCount = 0
    let unattempted = 0

    const topicStats = new Map<string, {
      correct: number
      wrong: number
      total: number
    }>()

    for (const examQuestion of attempt.exam.questions) {
      const question = examQuestion.question
      const correctOption = question.options.find(o => o.isCorrect)
      const correctAnswer = correctOption?.optionKey || null
      
      const userResponse = userAnswers[question.id]
      const userAnswer = userResponse?.selectedOption || null

      // Update topic stats
      const topicName = question.topic.name
      if (!topicStats.has(topicName)) {
        topicStats.set(topicName, { correct: 0, wrong: 0, total: 0 })
      }
      const stats = topicStats.get(topicName)!
      stats.total++

      // Calculate marks
      if (userAnswer === null) {
        unattempted++
      } else if (userAnswer === correctAnswer) {
        correctCount++
        score += question.marks
        stats.correct++
      } else {
        wrongCount++
        score -= question.negativeMarks
        stats.wrong++
      }
    }

    // 3. Calculate time taken
    const timeTaken = Math.floor(
      (new Date().getTime() - attempt.startedAt.getTime()) / 1000
    )

    // 4. Calculate percentage
    const percentage = (score / attempt.exam.totalMarks) * 100
    const submittedAt = new Date()

    // 5. ✅ FIXED: Calculate rank properly
    // Get ALL completed attempts for this exam (including duplicates per user)
    const allCompletedAttempts = await prisma.attempt.findMany({
      where: {
        examId: attempt.examId,
        status: 'completed'
      },
      select: {
        id: true,
        userId: true,
        score: true,
        timeSpentSec: true,
      }
    })

    // Add current attempt to the list
    const allAttemptsList = [
      ...allCompletedAttempts.map(a => ({
        id: a.id,
        userId: a.userId,
        score: a.score || 0,
        timeTaken: a.timeSpentSec || 0
      })),
      {
        id: attemptId,
        userId: attempt.userId,
        score,
        timeTaken
      }
    ]

    // Sort by: Higher score first, then faster time
    allAttemptsList.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.timeTaken - b.timeTaken
    })

    // Find current attempt's rank
    const userRank = allAttemptsList.findIndex(entry => entry.id === attemptId) + 1
    const totalAttempts = allAttemptsList.length

    // Calculate percentile
    const percentile = totalAttempts > 1 
      ? ((totalAttempts - userRank) / (totalAttempts - 1)) * 100 
      : 100

    // 6. Update attempt with results
    await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        status: 'completed',
        submittedAt,
        score,
        percentage,
        correctAnswers: correctCount,
        wrongAnswers: wrongCount,
        unattempted,
        timeSpentSec: timeTaken,
        rank: userRank,
        percentile: percentile
      }
    })

    // 7. ✅ FIXED: Update leaderboard properly
    // Check if user already has an entry for this exam
    const existingEntry = await prisma.leaderboardEntry.findUnique({
      where: {
        examId_userId: {
          examId: attempt.examId,
          userId: attempt.userId
        }
      }
    })

    // Only update if this is first attempt OR if new score is better
    const shouldUpdate = !existingEntry || score > existingEntry.score

    if (shouldUpdate) {
      await prisma.leaderboardEntry.upsert({
        where: {
          examId_userId: {
            examId: attempt.examId,
            userId: attempt.userId
          }
        },
        create: {
          examId: attempt.examId,
          userId: attempt.userId,
          attemptId: attempt.id,
          score,
          percentage,
          rank: userRank, // Temporary, will be recalculated
          timeTaken,
          submittedAt
        },
        update: {
          attemptId: attempt.id,
          score,
          percentage,
          rank: userRank, // Temporary, will be recalculated
          timeTaken,
          submittedAt
        }
      })

      // 8. ✅ FIXED: Recalculate ALL leaderboard ranks (using BEST attempt per user)
      // This MUST complete before returning response
      await recalculateLeaderboardRanks(attempt.examId)
    }

    // 9. Build topic-wise performance
    const topicWisePerformance = Array.from(topicStats.entries()).map(
      ([topic, stats]) => ({
        topic,
        correct: stats.correct,
        wrong: stats.wrong,
        total: stats.total,
        accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
      })
    )

    // 10. Return results
    return NextResponse.json({
      attemptId: attempt.id,
      examId: attempt.examId,
      examTitle: attempt.exam.title,
      score,
      totalMarks: attempt.exam.totalMarks,
      percentage: parseFloat(percentage.toFixed(2)),
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      unattempted,
      timeTaken,
      rank: userRank,
      percentile: parseFloat(percentile.toFixed(2)),
      totalAttempts,
      submittedAt: submittedAt.toISOString(),
      topicWisePerformance
    })

  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * Recalculate leaderboard ranks based on BEST score per user
 * This ensures leaderboard shows only best attempts and correct ranks
 */
async function recalculateLeaderboardRanks(examId: string) {
  try {
    // Get all leaderboard entries (best attempt per user)
    const entries = await prisma.leaderboardEntry.findMany({
      where: { examId },
      orderBy: [
        { score: 'desc' },
        { timeTaken: 'asc' }
      ]
    })

    // Update ranks in a transaction
    await prisma.$transaction(
      entries.map((entry, index) =>
        prisma.leaderboardEntry.update({
          where: { id: entry.id },
          data: { rank: index + 1 }
        })
      )
    )
  } catch (error) {
    console.error('Failed to recalculate leaderboard ranks:', error)
    throw error
  }
}