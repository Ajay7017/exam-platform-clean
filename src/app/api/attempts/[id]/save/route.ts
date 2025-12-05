// src/app/api/attempts/[id]/save/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const saveAnswerSchema = z.object({
  questionId: z.string().cuid(),
  selectedOption: z.enum(['A', 'B', 'C', 'D']).nullable(),
  markedForReview: z.boolean().optional().default(false)
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { questionId, selectedOption, markedForReview } = saveAnswerSchema.parse(body)
    const attemptId = params.id

    // 1. Get attempt
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        userId: true,
        status: true,
        expiresAt: true,
        answers: true
      }
    })

    if (!attempt) {
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      )
    }

    // 2. Verify ownership
    if (attempt.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      )
    }

    // 3. Check status
    if (attempt.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'This attempt is no longer active' },
        { status: 400 }
      )
    }

    // 4. Check if expired
    if (new Date() > attempt.expiresAt) {
      return NextResponse.json(
        { 
          error: 'Time expired. Exam will be auto-submitted.',
          autoSubmit: true 
        },
        { status: 400 }
      )
    }

    // 5. Update answers JSON
    const answers = (attempt.answers as Record<string, any>) || {}
    
    answers[questionId] = {
      selectedOption,
      markedForReview,
      answeredAt: new Date().toISOString()
    }

    // 6. Save to database
    await prisma.attempt.update({
      where: { id: attemptId },
      data: { 
        answers,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Answer saved successfully'
    })

  } catch (error) {
    return handleApiError(error)
  }
}