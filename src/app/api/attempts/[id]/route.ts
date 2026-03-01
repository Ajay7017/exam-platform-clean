// src/app/api/attempts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    const attemptId = params.id

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: {
            subject: { select: { name: true } },
            questions: {
              include: {
                question: {
                  include: {
                    options: {
                      orderBy: { sequence: 'asc' }
                    },
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

    if (attempt.status === 'completed') {
      return NextResponse.json(
        { error: 'Exam already submitted', attemptId: attempt.id },
        { status: 400 }
      )
    }

    if (new Date() > attempt.expiresAt) {
      return NextResponse.json(
        { error: 'Exam time expired', attemptId: attempt.id },
        { status: 400 }
      )
    }

    const questions = attempt.exam.questions.map(eq => eq.question)

    // Transform the raw DB answers JSON into the flat map the client uses.
    //
    // DB shape:  { [questionId]: { selectedOption, numericalAnswer, markedForReview, answeredAt } }
    // Client expects: { [questionId]: string | number | null }
    //
    // Without this transform, on page refresh the client stores the whole object
    // as the answer value, so option comparison (answers[id] === "A") always fails
    // and every question shows as unanswered in the palette.
    const rawAnswers = (attempt.answers as Record<string, any>) || {}
    const savedAnswers: Record<string, string | number | null> = {}
    const savedMarkedForReview: Record<string, boolean> = {}

    for (const [questionId, response] of Object.entries(rawAnswers)) {
      if (response && typeof response === 'object') {
        // Pick the right answer field based on what's populated
        if (response.numericalAnswer !== null && response.numericalAnswer !== undefined) {
          savedAnswers[questionId] = response.numericalAnswer
        } else if (response.selectedOption !== null && response.selectedOption !== undefined) {
          savedAnswers[questionId] = response.selectedOption
        } else {
          // Explicitly cleared — include as null so the client knows it was visited
          savedAnswers[questionId] = null
        }

        if (response.markedForReview) {
          savedMarkedForReview[questionId] = true
        }
      }
    }

    return NextResponse.json({
      attemptId: attempt.id,
      examId: attempt.exam.id,
      examTitle: attempt.exam.title,
      examSlug: attempt.exam.slug,
      subject: attempt.exam.subject?.name || 'Multi-Subject',
      duration: attempt.exam.durationMin,
      totalQuestions: questions.length,
      totalMarks: attempt.exam.totalMarks,
      passingMarks: attempt.exam.passingMarks || 0,
      instructions: attempt.exam.instructions,
      randomizeOrder: attempt.exam.randomizeOrder,
      allowReview: attempt.exam.allowReview,
      startedAt: attempt.startedAt.toISOString(),
      expiresAt: attempt.expiresAt.toISOString(),
      // Flat maps — ready to drop straight into React state
      savedAnswers,
      savedMarkedForReview,
      questions: questions.map((q, index) => ({
        id: q.id,
        sequence: index + 1,
        statement: q.statement,
        imageUrl: q.imageUrl,
        topic: q.topic.name,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        difficulty: q.difficulty,
        type: q.type ?? 'mcq',
        options: q.options.map(o => ({
          key: o.optionKey,
          text: o.text,
          imageUrl: o.imageUrl
          // isCorrect intentionally omitted — student must not see the answer
        }))
      }))
    })

  } catch (error) {
    return handleApiError(error)
  }
}