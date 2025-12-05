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

    // Fetch attempt with questions
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

    // Verify ownership
    if (attempt.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if already submitted
    if (attempt.status === 'completed') {
      return NextResponse.json(
        { error: 'Exam already submitted', attemptId: attempt.id },
        { status: 400 }
      )
    }

    // Check if expired
    if (new Date() > attempt.expiresAt) {
      return NextResponse.json(
        { error: 'Exam time expired', attemptId: attempt.id },
        { status: 400 }
      )
    }

    // Prepare questions WITHOUT answers
    const questions = attempt.exam.questions.map(eq => eq.question)

    // Return exam data
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
      savedAnswers: attempt.answers || {}, // Previously saved answers
      questions: questions.map((q, index) => ({
        id: q.id,
        sequence: index + 1,
        statement: q.statement,
        imageUrl: q.imageUrl,
        topic: q.topic.name,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        difficulty: q.difficulty,
        options: q.options.map(o => ({
          key: o.optionKey,
          text: o.text,
          imageUrl: o.imageUrl
          // ❌ NO isCorrect field!
        }))
      }))
    })

  } catch (error) {
    return handleApiError(error)
  }
}