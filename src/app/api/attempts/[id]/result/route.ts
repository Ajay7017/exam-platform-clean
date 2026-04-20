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

    const rank       = attempt.rank       ?? null
    const percentile = attempt.percentile ?? null

    const userAnswers       = (attempt.answers         as Record<string, any>)    || {}
    const timePerQuestionDB = (attempt.timePerQuestion as Record<string, number>) || {}

    // ── Topper ────────────────────────────────────────────────────────────
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

    // ── Averages ──────────────────────────────────────────────────────────
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

    // ── Attempt history ───────────────────────────────────────────────────
    const attemptHistory = await prisma.attempt.findMany({
      where: {
        userId:  session.user.id,
        examId:  attempt.examId,
        status:  'graded',
      },
      select: {
        id:             true,
        score:          true,
        percentage:     true,
        isOfficial:     true,
        submittedAt:    true,
        correctAnswers: true,
        wrongAnswers:   true,
      },
      orderBy: { submittedAt: 'asc' }
    })

    // ── Question results ──────────────────────────────────────────────────
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
          questionId:      question.id,
          statement:       question.statement,
          imageUrl:        question.imageUrl,
          topic:           question.topic.name,
          questionType:    'numerical',
          options:         [],
          yourAnswer:      userNum !== null ? String(userNum) : null,
          correctAnswer:   correctAnswerDisplay,
          isCorrect,
          explanation:     question.explanation,
          markedForReview: userResponse?.markedForReview || false,
          marks:           question.marks,
          negativeMarks:   question.negativeMarks,
          timeSpentSec,
          matchPairs:      null,
        }
      }

      // MCQ and Match
      const correctOption = question.options.find(o => o.isCorrect)
      return {
        questionId:      question.id,
        statement:       question.statement,
        imageUrl:        question.imageUrl,
        topic:           question.topic.name,
        questionType:    question.type ?? 'mcq',
        options:         question.options.map(opt => ({
          key:       opt.optionKey,
          text:      opt.text,
          imageUrl:  opt.imageUrl,
          isCorrect: opt.isCorrect,
        })),
        yourAnswer:      userResponse?.selectedOption || null,
        correctAnswer:   correctOption?.optionKey     || null,
        isCorrect:       userResponse?.selectedOption === correctOption?.optionKey,
        explanation:     question.explanation,
        markedForReview: userResponse?.markedForReview || false,
        marks:           question.marks,
        negativeMarks:   question.negativeMarks,
        timeSpentSec,
        matchPairs:      question.matchPairs ?? null,
      }
    })

    // ── Time stats ────────────────────────────────────────────────────────
    const timeStats = { correct: 0, wrong: 0, unattempted: 0 }
    for (const qr of questionResults) {
      if (qr.yourAnswer === null) timeStats.unattempted += qr.timeSpentSec
      else if (qr.isCorrect)     timeStats.correct      += qr.timeSpentSec
      else                       timeStats.wrong        += qr.timeSpentSec
    }

    // ── Topic performance ─────────────────────────────────────────────────
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
      attemptId:      attempt.id,
      examId:         attempt.examId,
      examTitle:      attempt.exam.title,
      score:          attempt.score,
      totalMarks:     attempt.exam.totalMarks,
      passingMarks:   attempt.exam.passingMarks || 40,
      percentage:     attempt.percentage,
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
      rank,
      percentile,
      totalAttempts:  totalOfficialAttempts,
      isOfficial:     attempt.isOfficial,
      attemptHistory: attemptHistory.map((a, i) => ({
        attemptNumber:  i + 1,
        attemptId:      a.id,
        score:          a.score         ?? 0,
        percentage:     a.percentage    ?? 0,
        isOfficial:     a.isOfficial,
        submittedAt:    a.submittedAt,
        correctAnswers: a.correctAnswers,
        wrongAnswers:   a.wrongAnswers,
        isCurrent:      a.id === attemptId,
      })),
    })

  } catch (error) {
    return handleApiError(error)
  }
}