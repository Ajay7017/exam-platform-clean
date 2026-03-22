// src/app/api/attempts/[id]/result/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const attemptId = params.id

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: {
            questions: {
              include: {
                question: {
                  include: {
                    options: { orderBy: { sequence: 'asc' } },
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

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    if (attempt.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!attempt.hasSubmitted) {
      return NextResponse.json({ error: 'Exam not yet submitted' }, { status: 400 })
    }

    if (attempt.status !== 'graded') {
      return NextResponse.json(
        { processing: true, status: attempt.status, attemptId: attempt.id },
        { status: 202 }
      )
    }

    // ✅ FIXED: rank/percentile now read directly from the Attempt record
    // (set by processExamResults). The leaderboard entry lookup was the
    // source of N/A — it only exists for official attempts and only for the
    // user's best score, so it was missing for many valid attempts.
    const rank       = attempt.rank       ?? null
    const percentile = attempt.percentile ?? null

    // Total official attempts for this exam (for rank display: "#3 / 120")

    // ── Topper & average (official attempts only) ─────────────────────────
    const userAnswers       = (attempt.answers         as Record<string, any>)    || {}
    const timePerQuestionDB = (attempt.timePerQuestion as Record<string, number>) || {}

    // ── Topper: fetch only the single best attempt ────────────────────────
    // Sorted by score desc, time asc — same logic as rank batch job.
    // Returns exactly 1 row regardless of how many attempts exist.
    const topperAttempt = await prisma.attempt.findFirst({
      where: {
        examId:     attempt.examId,
        status:     'graded',
        isOfficial: true,
        id:         { not: attemptId },
      },
      select: {
        score: true, correctAnswers: true, wrongAnswers: true,
        unattempted: true, timeSpentSec: true, percentage: true,
      },
      orderBy: [{ score: 'desc' }, { timeSpentSec: 'asc' }],
    })

    // ── Averages + count: Postgres aggregates server-side ─────────────────
    // No rows transferred — just one aggregate result row.
    const aggregates = await prisma.attempt.aggregate({
      where: {
        examId:     attempt.examId,
        status:     'graded',
        isOfficial: true,
        id:         { not: attemptId },
      },
      _avg: {
        score:          true,
        correctAnswers: true,
        wrongAnswers:   true,
        unattempted:    true,
        timeSpentSec:   true,
        percentage:     true,
      },
      _count: { id: true },
    })

    // Total official attempts = others + current attempt
    const totalOfficialAttempts = (aggregates._count.id ?? 0) + 1

    let comparisonStats: {
      topper:  { score: number; correct: number; wrong: number; unattempted: number; time: number; percentage: number } | null
      average: { score: number; correct: number; wrong: number; unattempted: number; time: number; percentage: number } | null
    } = { topper: null, average: null }

    if (topperAttempt) {
      comparisonStats.topper = {
        score:       topperAttempt.score          ?? 0,
        correct:     topperAttempt.correctAnswers,
        wrong:       topperAttempt.wrongAnswers,
        unattempted: topperAttempt.unattempted,
        time:        topperAttempt.timeSpentSec   ?? 0,
        percentage:  topperAttempt.percentage     ?? 0,
      }
    }

    if (aggregates._count.id > 0) {
      comparisonStats.average = {
        score:       aggregates._avg.score          ?? 0,
        correct:     aggregates._avg.correctAnswers ?? 0,
        wrong:       aggregates._avg.wrongAnswers   ?? 0,
        unattempted: aggregates._avg.unattempted    ?? 0,
        time:        aggregates._avg.timeSpentSec   ?? 0,
        percentage:  aggregates._avg.percentage     ?? 0,
      }
    }

    // ── ✅ NEW: attempt history for "Progress Over Time" chart ────────────
    // Fetch all completed attempts by this user for this exam, ordered by date.
    const attemptHistory = await prisma.attempt.findMany({
      where: {
        userId:  session.user.id,
        examId:  attempt.examId,
        status:  'graded',
      },
      select: {
        id:          true,
        score:       true,
        percentage:  true,
        isOfficial:  true,
        submittedAt: true,
        correctAnswers: true,
        wrongAnswers:   true,
      },
      orderBy: { submittedAt: 'asc' }
    })

    // ── question results (unchanged logic, timeSpentSec added) ───────────
    const questionResults = attempt.exam.questions.map((eq) => {
      const question     = eq.question
      const userResponse = userAnswers[question.id]
      const isNumerical  = question.type === 'numerical'
      const timeSpentSec = timePerQuestionDB[question.id] || 0

      if (isNumerical) {
        const userNum = userResponse?.numericalAnswer ?? null
        let isCorrect = false

        if (userNum !== null && userNum !== undefined) {
          if (question.correctAnswerExact !== null && question.correctAnswerExact !== undefined) {
            isCorrect = userNum === question.correctAnswerExact
          } else if (question.correctAnswerMin !== null && question.correctAnswerMax !== null) {
            isCorrect = userNum >= question.correctAnswerMin! && userNum <= question.correctAnswerMax!
          }
        }

        const correctAnswerDisplay =
          question.correctAnswerExact !== null && question.correctAnswerExact !== undefined
            ? String(question.correctAnswerExact)
            : `${question.correctAnswerMin} to ${question.correctAnswerMax}`

        return {
          questionId: question.id, statement: question.statement,
          imageUrl: question.imageUrl, topic: question.topic.name,
          questionType: 'numerical', options: [],
          yourAnswer:    userNum !== null ? String(userNum) : null,
          correctAnswer: correctAnswerDisplay,
          isCorrect, explanation: question.explanation,
          markedForReview: userResponse?.markedForReview || false,
          marks: question.marks, negativeMarks: question.negativeMarks,
          timeSpentSec,
        }
      }

      const correctOption = question.options.find(o => o.isCorrect)
      return {
        questionId: question.id, statement: question.statement,
        imageUrl: question.imageUrl, topic: question.topic.name,
        questionType: 'mcq',
        options: question.options.map(opt => ({
          key: opt.optionKey, text: opt.text,
          imageUrl: opt.imageUrl, isCorrect: opt.isCorrect,
        })),
        yourAnswer:    userResponse?.selectedOption || null,
        correctAnswer: correctOption?.optionKey     || null,
        isCorrect:     userResponse?.selectedOption === correctOption?.optionKey,
        explanation:   question.explanation,
        markedForReview: userResponse?.markedForReview || false,
        marks: question.marks, negativeMarks: question.negativeMarks,
        timeSpentSec,
      }
    })

    // ── time stats ────────────────────────────────────────────────────────
    const timeStats = { correct: 0, wrong: 0, unattempted: 0 }
    for (const qr of questionResults) {
      if (qr.yourAnswer === null)  timeStats.unattempted += qr.timeSpentSec
      else if (qr.isCorrect)      timeStats.correct      += qr.timeSpentSec
      else                        timeStats.wrong        += qr.timeSpentSec
    }

    // ── topic performance (unchanged) ─────────────────────────────────────
    const topicMap = new Map<string, { correct: number; wrong: number; total: number }>()
    questionResults.forEach((qr) => {
      const topic = qr.topic || 'Other'
      if (!topicMap.has(topic)) topicMap.set(topic, { correct: 0, wrong: 0, total: 0 })
      const stats = topicMap.get(topic)!
      stats.total++
      if (qr.yourAnswer) { if (qr.isCorrect) stats.correct++; else stats.wrong++ }
    })

    const topicWisePerformance = Array.from(topicMap.entries()).map(([topic, stats]) => ({
      topic,
      correct:  stats.correct,
      wrong:    stats.wrong,
      total:    stats.total,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    }))

    return NextResponse.json({
      // ── existing fields ──
      attemptId:    attempt.id,
      examId:       attempt.examId,
      examTitle:    attempt.exam.title,
      score:        attempt.score,
      totalMarks:   attempt.exam.totalMarks,
      passingMarks: attempt.exam.passingMarks || 40,
      percentage:   attempt.percentage,
      correctAnswers: attempt.correctAnswers,
      wrongAnswers:   attempt.wrongAnswers,
      unattempted:    attempt.unattempted,
      timeSpent:      attempt.timeSpentSec,
      submittedAt:    attempt.submittedAt,
      topicWisePerformance,
      questionResults,
      suspiciousFlags: attempt.suspiciousFlags,
      tabSwitchCount:  attempt.tabSwitchCount,
      timeStats,
      comparisonStats,

      // ✅ FIXED: rank now from Attempt record directly (not leaderboard lookup)
      rank:         rank,
      percentile:   percentile,
      totalAttempts: totalOfficialAttempts,

      // ✅ NEW fields
      isOfficial:     attempt.isOfficial,   // for Practice badge on result page
      attemptHistory: attemptHistory.map((a, i) => ({
        attemptNumber: i + 1,
        attemptId:     a.id,
        score:         a.score         ?? 0,
        percentage:    a.percentage    ?? 0,
        isOfficial:    a.isOfficial,
        submittedAt:   a.submittedAt,
        correctAnswers: a.correctAnswers,
        wrongAnswers:   a.wrongAnswers,
        isCurrent:     a.id === attemptId,
      })),
    })

  } catch (error) {
    return handleApiError(error)
  }
}