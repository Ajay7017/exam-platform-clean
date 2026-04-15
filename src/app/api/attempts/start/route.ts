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

    // Check phone number before anything else
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { phone: true }
    })

    if (!user?.phone || user.phone.trim() === '') {
      return NextResponse.json(
        { 
          error: 'Phone number required',
          code: 'PHONE_REQUIRED',
          message: 'Please add your phone number to your profile before taking an exam.'
        },
        { status: 403 }
      )
    }

    // 1. Get exam with all questions
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        subject: { select: { name: true } },
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
    })

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    if (!exam.isPublished) {
      return NextResponse.json({ error: 'This exam is not yet published' }, { status: 403 })
    }

    // 2. Check for existing ACTIVE attempt (resume flow — unchanged)
    const existingActiveAttempt = await prisma.attempt.findFirst({
      where: {
        userId: session.user.id,
        examId,
        status: 'in_progress'
      }
    })

    if (existingActiveAttempt) {
      return NextResponse.json(
        {
          error:     'You already have an active attempt',
          attemptId: existingActiveAttempt.id,
          canResume: true
        },
        { status: 400 }
      )
    }

    // 3. Check purchase for paid exams (unchanged)
    if (!exam.isFree && exam.isPaid) {
      const purchase = await prisma.purchase.findFirst({
        where: {
          userId: session.user.id,
          examId,
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

    // ✅ NEW: Determine if this is an official or practice attempt.
    // Official = the student's FIRST completed attempt for this exam.
    // Any subsequent attempt is practice (doesn't affect leaderboard/rank).
    const previousCompletedAttempt = await prisma.attempt.findFirst({
      where: {
        userId:     session.user.id,
        examId,
        hasSubmitted: true,
        isOfficial: true,          // only care if they already have an official one
      },
      select: { id: true }
    })

    const isOfficial = !previousCompletedAttempt  // true only if no prior official attempt

    // 4. Prepare questions (randomize if enabled) — unchanged
    let questions = exam.questions.map(eq => eq.question)
    if (exam.randomizeOrder) {
      questions = questions.sort(() => Math.random() - 0.5)
    }

    // 5. Calculate expiry time — unchanged
    const expiresAt = new Date(Date.now() + exam.durationMin * 60 * 1000)

    // 6. Create attempt — ✅ NEW: include isOfficial
    const attempt = await prisma.attempt.create({
      data: {
        userId:         session.user.id,
        examId,
        status:         'in_progress',
        isOfficial,                          // ✅ NEW
        startedAt:      new Date(),
        expiresAt,
        totalQuestions: questions.length,
        answers:        {},
        ipAddress:      request.headers.get('x-forwarded-for') ||
                        request.headers.get('x-real-ip') ||
                        'unknown'
      }
    })

    // 7. Increment exam attempt count — unchanged
    await prisma.exam.update({
      where: { id: examId },
      data:  { totalAttempts: { increment: 1 } }
    })

    // 8. Return exam data — ✅ NEW: include isOfficial so client can show Practice badge
    return NextResponse.json({
      attemptId:       attempt.id,
      examId:          exam.id,
      examTitle:       exam.title,
      examSlug:        exam.slug,
      subject:         exam.subject?.name || 'Multi-Subject',
      duration:        exam.durationMin,
      totalQuestions:  questions.length,
      totalMarks:      exam.totalMarks,
      passingMarks:    exam.passingMarks,
      instructions:    exam.instructions,
      randomizeOrder:  exam.randomizeOrder,
      allowReview:     exam.allowReview,
      isOfficial,                            // ✅ NEW
      startedAt:       attempt.startedAt.toISOString(),
      expiresAt:       attempt.expiresAt.toISOString(),
      questions: questions.map((q, index) => ({
        id:            q.id,
        sequence:      index + 1,
        statement:     q.statement,
        imageUrl:      q.imageUrl,
        topic:         q.topic?.name || 'General',
        marks:         q.marks,
        negativeMarks: q.negativeMarks,
        difficulty:    q.difficulty,
        type:          q.type ?? 'mcq',
        options: q.options.map(o => ({
          key:      o.optionKey,
          text:     o.text,
          imageUrl: o.imageUrl
        }))
      }))
    })

  } catch (error) {
    return handleApiError(error)
  }
}