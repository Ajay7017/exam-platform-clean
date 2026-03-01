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
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    if (attempt.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (attempt.status !== 'completed') {
      return NextResponse.json({ error: 'Exam not yet submitted' }, { status: 400 })
    }

    const leaderboardEntry = await prisma.leaderboardEntry.findFirst({
      where: { attemptId },
    })

    const totalAttempts = await prisma.leaderboardEntry.count({
      where: { examId: attempt.examId },
    })

    const userAnswers = (attempt.answers as Record<string, any>) || {}

    // ✅ UPDATED: handles both MCQ and NAT questions
    const questionResults = attempt.exam.questions.map((eq) => {
      const question = eq.question
      const userResponse = userAnswers[question.id]
      const isNumerical = question.type === 'numerical'

      if (isNumerical) {
        // ✅ NEW: NAT grading for results
        const userNum = userResponse?.numericalAnswer ?? null
        let isCorrect = false

        if (userNum !== null && userNum !== undefined) {
          if (question.correctAnswerExact !== null && question.correctAnswerExact !== undefined) {
            isCorrect = userNum === question.correctAnswerExact
          } else if (question.correctAnswerMin !== null && question.correctAnswerMax !== null) {
            isCorrect = userNum >= question.correctAnswerMin! && userNum <= question.correctAnswerMax!
          }
        }

        // Build correct answer display string
        const correctAnswerDisplay = question.correctAnswerExact !== null && question.correctAnswerExact !== undefined
          ? String(question.correctAnswerExact)
          : `${question.correctAnswerMin} to ${question.correctAnswerMax}`

        return {
          questionId: question.id,
          statement: question.statement,
          imageUrl: question.imageUrl,
          topic: question.topic.name,
          // ✅ NEW: NAT type info
          questionType: 'numerical',
          options: [], // no options for NAT
          yourAnswer: userNum !== null && userNum !== undefined ? String(userNum) : null,
          correctAnswer: correctAnswerDisplay,
          isCorrect,
          explanation: question.explanation,
          markedForReview: userResponse?.markedForReview || false,
          marks: question.marks,
          negativeMarks: question.negativeMarks,
        }
      }

      // ✅ EXISTING: MCQ grading — untouched
      const correctOption = question.options.find(o => o.isCorrect)
      return {
        questionId: question.id,
        statement: question.statement,
        imageUrl: question.imageUrl,
        topic: question.topic.name,
        questionType: 'mcq',
        options: question.options.map((opt) => ({
          key: opt.optionKey,
          text: opt.text,
          imageUrl: opt.imageUrl,
          isCorrect: opt.isCorrect,
        })),
        yourAnswer: userResponse?.selectedOption || null,
        correctAnswer: correctOption?.optionKey || null,
        isCorrect: userResponse?.selectedOption === correctOption?.optionKey,
        explanation: question.explanation,
        markedForReview: userResponse?.markedForReview || false,
        marks: question.marks,
        negativeMarks: question.negativeMarks,
      }
    })

    // ✅ EXISTING: topic performance — untouched
    const topicMap = new Map<string, { correct: number; wrong: number; total: number }>()

    questionResults.forEach((qr) => {
      const topic = qr.topic || 'Other'
      if (!topicMap.has(topic)) {
        topicMap.set(topic, { correct: 0, wrong: 0, total: 0 })
      }
      const stats = topicMap.get(topic)!
      stats.total++
      if (qr.yourAnswer) {
        if (qr.isCorrect) stats.correct++
        else stats.wrong++
      }
    })

    const topicWisePerformance = Array.from(topicMap.entries()).map(
      ([topic, stats]) => ({
        topic,
        correct: stats.correct,
        wrong: stats.wrong,
        total: stats.total,
        accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
      })
    )

    const percentile = totalAttempts > 0 && leaderboardEntry?.rank
      ? ((totalAttempts - leaderboardEntry.rank + 1) / totalAttempts) * 100
      : null

    return NextResponse.json({
      attemptId: attempt.id,
      examId: attempt.examId,
      examTitle: attempt.exam.title,
      score: attempt.score,
      totalMarks: attempt.exam.totalMarks,
      passingMarks: attempt.exam.passingMarks || 40,
      percentage: attempt.percentage,
      percentile,
      correctAnswers: attempt.correctAnswers,
      wrongAnswers: attempt.wrongAnswers,
      unattempted: attempt.unattempted,
      timeSpent: attempt.timeSpentSec,
      submittedAt: attempt.submittedAt,
      rank: leaderboardEntry?.rank || null,
      totalAttempts,
      topicWisePerformance,
      questionResults,
      suspiciousFlags: attempt.suspiciousFlags,
      tabSwitchCount: attempt.tabSwitchCount,
    })
  } catch (error) {
    return handleApiError(error)
  }
}