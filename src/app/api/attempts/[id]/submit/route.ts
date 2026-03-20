import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { queueExamGrading } from '@/lib/queue'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session   = await requireAuth()
    const attemptId = params.id

    const attempt = await prisma.attempt.findUnique({
      where:  { id: attemptId },
      select: { id: true, userId: true, examId: true, status: true, isOfficial: true },
    })

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }
    if (attempt.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    if (attempt.status !== 'in_progress') {
      return NextResponse.json({ error: 'Attempt already submitted' }, { status: 400 })
    }

    // ── Dual write: Postgres first, then queue ────────────────────────────
    // Postgres write is the source of truth. Even if Redis crashes after this,
    // answers are safe and status shows grading_queued for manual requeue.
    await prisma.attempt.update({
      where: { id: attemptId },
      data:  {
        status:       'grading_queued',
        hasSubmitted: true,             // set once, never changes — used by eligibility check
        submittedAt:  new Date(),
      },
    })

    await queueExamGrading({
      attemptId,
      examId:     attempt.examId,
      userId:     attempt.userId,
      isOfficial: attempt.isOfficial,
    })

    // ── Return 202 immediately — do not wait for grading ─────────────────
    return NextResponse.json(
      {
        success:    true,
        attemptId:  attempt.id,
        examId:     attempt.examId,
        isOfficial: attempt.isOfficial,
        message:    'Exam submitted. Results are being calculated.',
        processing: true,
      },
      { status: 202 }
    )

  } catch (error) {
    console.error('Submit error:', error)
    return handleApiError(error)
  }
}