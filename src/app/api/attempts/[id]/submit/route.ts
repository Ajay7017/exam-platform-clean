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

    // 1. Quick validation - Get minimal attempt data
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        userId: true,
        examId: true,
        status: true
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

    // 2. Immediately mark as completed to prevent double submission
    await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        status: 'completed',
        submittedAt: new Date()
      }
    })

    // 3. Return success immediately - processing happens in background
    const response = NextResponse.json({
      success: true,
      attemptId: attempt.id,
      examId: attempt.examId,
      message: 'Exam submitted successfully. Results are being processed.',
      processing: true
    })

    // 4. Start background processing (non-blocking)
    // This runs after the response is sent
    processExamResults(attemptId, attempt.examId, attempt.userId).catch(error => {
      console.error('Background processing error:', error)
    })

    return response

  } catch (error) {
    console.error('Submit error:', error)
    return handleApiError(error)
  }
}

/**
 * Background processing function - runs after response is sent
 * Calculates scores, ranks, and updates leaderboard
 */
async function processExamResults(attemptId: string, examId: string, userId: string) {
  try {
    console.log(`[Background] Processing results for attempt ${attemptId}`)

    // Get complete attempt data with all questions
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
      console.error('[Background] Attempt not found')
      return
    }

    // Calculate score
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

    // Calculate time taken
    const timeTaken = Math.floor(
      (new Date(attempt.submittedAt!).getTime() - attempt.startedAt.getTime()) / 1000
    )

    // Calculate percentage
    const percentage = (score / attempt.exam.totalMarks) * 100

    // Calculate rank (Optimized - count better attempts)
    const betterAttemptsCount = await prisma.attempt.count({
      where: {
        examId: attempt.examId,
        status: 'completed',
        OR: [
          { score: { gt: score } },
          {
            score: score,
            timeSpentSec: { lt: timeTaken }
          }
        ]
      }
    })

    const userRank = betterAttemptsCount + 1

    // Get total attempts for percentile
    const totalCompletedAttempts = await prisma.attempt.count({
      where: {
        examId: attempt.examId,
        status: 'completed'
      }
    })

    const totalAttempts = totalCompletedAttempts
    const percentile = totalAttempts > 1 
      ? ((totalAttempts - userRank) / (totalAttempts - 1)) * 100 
      : 100

    // Update attempt with results
    await prisma.attempt.update({
      where: { id: attemptId },
      data: {
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

    // Update leaderboard
    const existingEntry = await prisma.leaderboardEntry.findUnique({
      where: {
        examId_userId: {
          examId: attempt.examId,
          userId: attempt.userId
        }
      }
    })

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
          rank: userRank,
          timeTaken,
          submittedAt: attempt.submittedAt!
        },
        update: {
          attemptId: attempt.id,
          score,
          percentage,
          rank: userRank,
          timeTaken,
          submittedAt: attempt.submittedAt!
        }
      })
    }

    console.log(`[Background] Successfully processed attempt ${attemptId} - Score: ${score}, Rank: ${userRank}`)

  } catch (error) {
    console.error('[Background] Processing error:', error)
    
    // Mark attempt as having an error
    await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        status: 'completed' // Keep as completed but log the error
      }
    }).catch(err => console.error('Failed to update error status:', err))
  }
}