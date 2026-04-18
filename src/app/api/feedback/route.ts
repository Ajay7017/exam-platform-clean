// src/app/api/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const FeedbackSchema = z.object({
  examId:           z.string().min(1),
  attemptId:        z.string().min(1),
  difficultyRating: z.number().int().min(1).max(5),
  experienceRating: z.number().int().min(1).max(5),
  comments:         z.string().max(1000).optional(),
})

// POST — student submits feedback
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body    = await request.json()
    const data    = FeedbackSchema.parse(body)

    // verify attempt belongs to this student
    const attempt = await prisma.attempt.findUnique({
      where: { id: data.attemptId },
      select: { userId: true, examId: true, hasSubmitted: true }
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
    if (attempt.examId !== data.examId) {
      return NextResponse.json({ error: 'Exam mismatch' }, { status: 400 })
    }

    const feedback = await prisma.examFeedback.create({
      data: {
        userId:           session.user.id,
        examId:           data.examId,
        attemptId:        data.attemptId,
        difficultyRating: data.difficultyRating,
        experienceRating: data.experienceRating,
        comments:         data.comments,
      }
    })

    return NextResponse.json({ success: true, feedback }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

// GET — student gets all their feedback with admin replies
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()

    const feedbacks = await prisma.examFeedback.findMany({
      where:   { userId: session.user.id },
      include: {
        exam: { select: { id: true, title: true, slug: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ feedbacks })
  } catch (error) {
    return handleApiError(error)
  }
}