import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { queueExamGrading } from '@/lib/queue'
import redis from '@/lib/redis' // ✅ Import Redis

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

    // ── ✅ NEW: PRIORITY FLUSH FROM REDIS TO POSTGRES ──────────────────
    // Before grading starts, we MUST ensure the latest answers are in DB
    if (redis) {
      const REDIS_KEY = `exam:autosave:${attemptId}`
      const rawData = await redis.get(REDIS_KEY)
      
      if (rawData) {
        const data = JSON.parse(rawData)
        console.log(`[SUBMIT] Priority flushing data for ${attemptId}`)
        
        // Sync Redis data to DB right now so the grader sees the latest work
        await prisma.attempt.update({
          where: { id: attemptId },
          data: {
            answers: data.answers,
            timePerQuestion: data.timePerQuestion,
            updatedAt: new Date(),
          }
        })

        // Clean up Redis - we no longer need the buffer or the sync flag
        await Promise.all([
          redis.del(REDIS_KEY),
          redis.srem('exam:pending_sync_attempts', attemptId)
        ])
      }
    }

    // ── Dual write: Update status ──────────────────────────────────────────
    await prisma.attempt.update({
      where: { id: attemptId },
      data:  {
        status:       'grading_queued',
        hasSubmitted: true,
        submittedAt:  new Date(),
      },
    })

    await queueExamGrading({
      attemptId,
      examId:     attempt.examId,
      userId:     attempt.userId,
      isOfficial: attempt.isOfficial,
    })

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