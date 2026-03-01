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
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    if (attempt.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (attempt.status !== 'in_progress') {
      return NextResponse.json({ error: 'Attempt already submitted' }, { status: 400 })
    }

    // Mark as completed immediately so the client can proceed.
    // The heavy grading work runs in the background — the client polls for
    // results or sees a "processing" state.
    await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        status: 'completed',
        submittedAt: new Date()
      }
    })

    // Fire-and-forget — do NOT await. The response goes back to the client
    // while grading runs in the background.
    processExamResults(attemptId, attempt.examId, attempt.userId).catch(error => {
      console.error('[Background] Processing error:', error)
    })

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      examId: attempt.examId,
      message: 'Exam submitted successfully. Results are being processed.',
      processing: true
    })

  } catch (error) {
    console.error('Submit error:', error)
    return handleApiError(error)
  }
}

async function processExamResults(attemptId: string, examId: string, userId: string) {
  console.log(`[Background] Processing results for attempt ${attemptId}`)

  try {
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
                    topic: { select: { name: true } }
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

    const userAnswers = (attempt.answers as Record<string, any>) || {}

    let score = 0
    let correctCount = 0
    let wrongCount = 0
    let unattempted = 0

    const topicStats = new Map<string, { correct: number; wrong: number; total: number }>()

    for (const examQuestion of attempt.exam.questions) {
      const question = examQuestion.question
      const userResponse = userAnswers[question.id]

      const topicName = question.topic.name
      if (!topicStats.has(topicName)) {
        topicStats.set(topicName, { correct: 0, wrong: 0, total: 0 })
      }
      const stats = topicStats.get(topicName)!
      stats.total++

      if (question.type === 'numerical') {
        // ── NAT grading ──────────────────────────────────────────────────────
        const userNum = userResponse?.numericalAnswer ?? null

        if (userNum === null || userNum === undefined) {
          unattempted++
        } else if (
          question.correctAnswerExact !== null &&
          question.correctAnswerExact !== undefined
        ) {
          // Exact match
          if (userNum === question.correctAnswerExact) {
            correctCount++
            score += question.marks
            stats.correct++
          } else {
            wrongCount++
            score -= question.negativeMarks
            stats.wrong++
          }
        } else if (
          question.correctAnswerMin !== null &&
          question.correctAnswerMin !== undefined &&
          question.correctAnswerMax !== null &&
          question.correctAnswerMax !== undefined
        ) {
          // Range match
          if (userNum >= question.correctAnswerMin && userNum <= question.correctAnswerMax) {
            correctCount++
            score += question.marks
            stats.correct++
          } else {
            wrongCount++
            score -= question.negativeMarks
            stats.wrong++
          }
        } else {
          // No valid answer key configured — treat as unattempted
          unattempted++
        }

      } else {
        // ── MCQ grading ──────────────────────────────────────────────────────
        const correctOption = question.options.find(o => o.isCorrect)
        const correctAnswer = correctOption?.optionKey ?? null
        const userAnswer = userResponse?.selectedOption ?? null

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
    }

    const timeTaken = Math.floor(
      (new Date(attempt.submittedAt!).getTime() - attempt.startedAt.getTime()) / 1000
    )

    const percentage = attempt.exam.totalMarks > 0
      ? (score / attempt.exam.totalMarks) * 100
      : 0

    // ── Atomic rank calculation ───────────────────────────────────────────────
    //
    // The original code ran two separate COUNT queries, which created a race
    // condition: another attempt could be submitted between the two queries,
    // making betterAttemptsCount and totalCompletedAttempts inconsistent.
    //
    // Solution: fetch all completed scores in one query, compute rank in memory.
    // This is safe for exam sizes up to tens of thousands of attempts and avoids
    // the need for a database-level lock.
    const completedAttempts = await prisma.attempt.findMany({
      where: {
        examId,
        status: 'completed',
        id: { not: attemptId } // exclude current attempt — it's already 'completed' in DB
      },
      select: { score: true, timeSpentSec: true },
      orderBy: [{ score: 'desc' }, { timeSpentSec: 'asc' }]
    })

    // Rank = number of attempts that beat this one + 1.
    // Tie-breaking: same score but lower time = better rank.
    const betterCount = completedAttempts.filter(a => {
      if (a.score > score) return true
      if (a.score === score && (a.timeSpentSec ?? Infinity) < timeTaken) return true
      return false
    }).length

    const userRank = betterCount + 1
    const totalAttempts = completedAttempts.length + 1 // include current attempt

    const percentile = totalAttempts > 1
      ? ((totalAttempts - userRank) / (totalAttempts - 1)) * 100
      : 100

    // ── Persist results and leaderboard in one transaction ───────────────────
    await prisma.$transaction(async (tx) => {
      await tx.attempt.update({
        where: { id: attemptId },
        data: {
          score,
          percentage,
          correctAnswers: correctCount,
          wrongAnswers: wrongCount,
          unattempted,
          timeSpentSec: timeTaken,
          rank: userRank,
          percentile,
        }
      })

      // Only update the leaderboard if this is the user's best score
      const existingEntry = await tx.leaderboardEntry.findUnique({
        where: { examId_userId: { examId, userId } }
      })

      if (!existingEntry || score > existingEntry.score) {
        await tx.leaderboardEntry.upsert({
          where: { examId_userId: { examId, userId } },
          create: {
            examId,
            userId,
            attemptId,
            score,
            percentage,
            rank: userRank,
            timeTaken,
            submittedAt: attempt.submittedAt!
          },
          update: {
            attemptId,
            score,
            percentage,
            rank: userRank,
            timeTaken,
            submittedAt: attempt.submittedAt!
          }
        })
      }
    })

    console.log(
      `[Background] Done — attempt ${attemptId} | score: ${score} | rank: ${userRank}/${totalAttempts}`
    )

  } catch (error) {
    console.error('[Background] Processing error:', error)
    // Don't re-throw — the attempt is already marked completed.
    // The score fields will just be null/0 and can be reprocessed if needed.
  }
}