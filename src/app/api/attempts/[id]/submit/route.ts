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
    const session   = await requireAuth()
    const attemptId = params.id

    const attempt = await prisma.attempt.findUnique({
      where:  { id: attemptId },
      select: { id: true, userId: true, examId: true, status: true, isOfficial: true }
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

    await prisma.attempt.update({
      where: { id: attemptId },
      data:  { status: 'completed', submittedAt: new Date() }
    })

    // Fire-and-forget background grading
    processExamResults(attemptId, attempt.examId, attempt.userId, attempt.isOfficial).catch(error => {
      console.error('[Background] Processing error:', error)
    })

    return NextResponse.json({
      success:    true,
      attemptId:  attempt.id,
      examId:     attempt.examId,
      isOfficial: attempt.isOfficial,  // ✅ NEW: client can show appropriate message
      message:    'Exam submitted successfully. Results are being processed.',
      processing: true
    })

  } catch (error) {
    console.error('Submit error:', error)
    return handleApiError(error)
  }
}

// ✅ UPDATED: accepts isOfficial flag — leaderboard only updated for official attempts
async function processExamResults(
  attemptId: string,
  examId:    string,
  userId:    string,
  isOfficial: boolean
) {
  console.log(`[Background] Processing results for attempt ${attemptId} (official: ${isOfficial})`)

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
                    topic:   { select: { name: true } }
                  }
                }
              },
              orderBy: { sequence: 'asc' }
            }
          }
        }
      }
    })

    if (!attempt) { console.error('[Background] Attempt not found'); return }

    const userAnswers = (attempt.answers as Record<string, any>) || {}

    let score        = 0
    let correctCount = 0
    let wrongCount   = 0
    let unattempted  = 0

    for (const examQuestion of attempt.exam.questions) {
      const question     = examQuestion.question
      const userResponse = userAnswers[question.id]

      if (question.type === 'numerical') {
        const userNum = userResponse?.numericalAnswer ?? null

        if (userNum === null || userNum === undefined) {
          unattempted++
        } else if (
          question.correctAnswerExact !== null &&
          question.correctAnswerExact !== undefined
        ) {
          if (userNum === question.correctAnswerExact) {
            correctCount++; score += question.marks
          } else {
            wrongCount++; score -= question.negativeMarks
          }
        } else if (
          question.correctAnswerMin !== null &&
          question.correctAnswerMax !== null
        ) {
          if (userNum >= question.correctAnswerMin! && userNum <= question.correctAnswerMax!) {
            correctCount++; score += question.marks
          } else {
            wrongCount++; score -= question.negativeMarks
          }
        } else {
          unattempted++
        }

      } else {
        const correctOption = question.options.find(o => o.isCorrect)
        const correctAnswer = correctOption?.optionKey ?? null
        const userAnswer    = userResponse?.selectedOption ?? null

        if (userAnswer === null) {
          unattempted++
        } else if (userAnswer === correctAnswer) {
          correctCount++; score += question.marks
        } else {
          wrongCount++; score -= question.negativeMarks
        }
      }
    }

    const timeTaken = Math.floor(
      (new Date(attempt.submittedAt!).getTime() - attempt.startedAt.getTime()) / 1000
    )

    const percentage = attempt.exam.totalMarks > 0
      ? (score / attempt.exam.totalMarks) * 100
      : 0

    // ✅ UPDATED: rank is calculated ONLY against official attempts
    const completedAttempts = await prisma.attempt.findMany({
      where: {
        examId,
        status:     'completed',
        isOfficial: true,          // ✅ only official attempts count for rank
        id:         { not: attemptId }
      },
      select: { score: true, timeSpentSec: true }
    })

    let userRank      = null
    let percentile    = null
    let totalOfficial = null

    if (isOfficial) {
      // ✅ Only compute rank for official attempts
      const betterCount = completedAttempts.filter(a => {
        if ((a.score ?? -Infinity) > score) return true
        if (a.score === score && (a.timeSpentSec ?? Infinity) < timeTaken) return true
        return false
      }).length

      userRank      = betterCount + 1
      totalOfficial = completedAttempts.length + 1
      percentile    = totalOfficial > 1
        ? ((totalOfficial - userRank) / (totalOfficial - 1)) * 100
        : 100
    }

    // ✅ Persist results
    await prisma.$transaction(async (tx) => {
      await tx.attempt.update({
        where: { id: attemptId },
        data:  {
          score,
          percentage,
          correctAnswers: correctCount,
          wrongAnswers:   wrongCount,
          unattempted,
          timeSpentSec:   timeTaken,
          rank:           userRank,      // null for practice attempts
          percentile,                    // null for practice attempts
        }
      })

      // ✅ Leaderboard only updated for official attempts
      if (isOfficial) {
        const existingEntry = await tx.leaderboardEntry.findUnique({
          where: { examId_userId: { examId, userId } }
        })

        if (!existingEntry || score > existingEntry.score) {
          await tx.leaderboardEntry.upsert({
            where:  { examId_userId: { examId, userId } },
            create: {
              examId, userId, attemptId,
              score, percentage,
              rank:        userRank!,
              timeTaken,
              submittedAt: attempt.submittedAt!
            },
            update: {
              attemptId, score, percentage,
              rank:        userRank!,
              timeTaken,
              submittedAt: attempt.submittedAt!
            }
          })
        }
      }
    })

    console.log(
      `[Background] Done — attempt ${attemptId} | score: ${score} | ` +
      `rank: ${userRank ?? 'N/A (practice)'}`
    )

  } catch (error) {
    console.error('[Background] Processing error:', error)
  }
}