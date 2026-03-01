// src/app/api/attempts/[id]/save-batch/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const batchSaveSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().cuid(),
        // MCQ option — A/B/C/D or null (cleared)
        selectedOption: z.enum(['A', 'B', 'C', 'D']).nullable().optional(),
        // NAT numerical answer or null (cleared)
        numericalAnswer: z.number().nullable().optional(),
        markedForReview: z.boolean().optional(),
      })
    )
    .min(1)
    .max(200),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { answers: newAnswers } = batchSaveSchema.parse(body)
    const attemptId = params.id

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: {
        userId: true,
        status: true,
        expiresAt: true,
        answers: true,
      },
    })

    if (!attempt || attempt.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (attempt.status !== 'in_progress' || new Date() > attempt.expiresAt) {
      return NextResponse.json(
        { error: 'Attempt no longer active', autoSubmit: true },
        { status: 400 }
      )
    }

    const existingAnswers = (attempt.answers as Record<string, any>) || {}
    const timestamp = new Date().toISOString()

    newAnswers.forEach(answer => {
      // Always write the record — including when selectedOption/numericalAnswer
      // are null, because that means the user explicitly cleared their answer.
      // Skipping nulls would leave stale data in the DB.
      existingAnswers[answer.questionId] = {
        selectedOption: answer.selectedOption ?? null,
        numericalAnswer: answer.numericalAnswer ?? null,
        markedForReview: answer.markedForReview || false,
        answeredAt: timestamp,
      }
    })

    await prisma.attempt.update({
      where: { id: attemptId },
      data: { answers: existingAnswers },
    })

    return NextResponse.json({
      success: true,
      saved: newAnswers.length,
    })
  } catch (error) {
    return handleApiError(error)
  }
}