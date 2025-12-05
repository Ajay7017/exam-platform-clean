// src/app/api/attempts/start/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const startExamSchema = z.object({
  examId: z.string().cuid()
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { examId } = startExamSchema.parse(body)

    // 1. Get exam with all questions
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
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
    })

    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      )
    }

    if (!exam.isPublished) {
      return NextResponse.json(
        { error: 'This exam is not yet published' },
        { status: 403 }
      )
    }

    // 2. Check for existing active attempt
    const existingAttempt = await prisma.attempt.findFirst({
      where: {
        userId: session.user.id,
        examId: examId,
        status: 'in_progress'
      }
    })

    if (existingAttempt) {
      // Return existing attempt instead of error
      return NextResponse.json(
        { 
          error: 'You already have an active attempt',
          attemptId: existingAttempt.id,
          canResume: true
        },
        { status: 400 }
      )
    }

    // 3. Check if exam is free or purchased (skip for now)
    if (!exam.isFree && exam.isPaid) {
      const purchase = await prisma.purchase.findFirst({
        where: {
          userId: session.user.id,
          examId: examId,
          status: 'active',
          OR: [
            { validUntil: { gte: new Date() } },
            { validUntil: null }
          ]
        }
      })

      if (!purchase) {
        return NextResponse.json(
          { error: 'You must purchase this exam to take it' },
          { status: 403 }
        )
      }
    }

    // 4. Prepare questions (randomize if enabled)
    let questions = exam.questions.map(eq => eq.question)
    
    if (exam.randomizeOrder) {
      questions = questions.sort(() => Math.random() - 0.5)
    }

    // 5. Calculate expiry time
    const expiresAt = new Date(Date.now() + exam.durationMin * 60 * 1000)

    // 6. Create attempt
    const attempt = await prisma.attempt.create({
      data: {
        userId: session.user.id,
        examId: examId,
        status: 'in_progress',
        startedAt: new Date(),
        expiresAt: expiresAt,
        totalQuestions: questions.length,
        answers: {},
        ipAddress: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown'
      }
    })

    // 7. Increment exam attempt count
    await prisma.exam.update({
      where: { id: examId },
      data: { totalAttempts: { increment: 1 } }
    })

    // 8. Return exam data WITHOUT answers
    return NextResponse.json({
      attemptId: attempt.id,
      examId: exam.id,
      examTitle: exam.title,
      examSlug: exam.slug,
      subject: exam.subject?.name || 'Multi-Subject',
      duration: exam.durationMin,
      totalQuestions: questions.length,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      instructions: exam.instructions,
      randomizeOrder: exam.randomizeOrder,
      allowReview: exam.allowReview,
      startedAt: attempt.startedAt.toISOString(),
      expiresAt: attempt.expiresAt.toISOString(),
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
        // ❌ NO explanation field!
        // ❌ NO correctAnswer field!
      }))
    })

  } catch (error) {
    return handleApiError(error)
  }
}