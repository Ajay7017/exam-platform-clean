import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import redis from '@/lib/redis' // ✅ Import your raw Redis client
import { z } from 'zod'

const batchSaveSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().cuid(),
        selectedOption: z.enum(['A', 'B', 'C', 'D']).nullable().optional(),
        numericalAnswer: z.number().nullable().optional(),
        markedForReview: z.boolean().optional(),
      })
    )
    .min(1)
    .max(200),
  timePerQuestion: z
    .record(z.string().cuid(), z.number().int().nonnegative())
    .optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { answers: newAnswers, timePerQuestion: incomingTime } = batchSaveSchema.parse(body)
    const attemptId = params.id

    // 1. Verify Attempt (We still read from Prisma for security, but reads are cheap)
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: {
        userId: true,
        status: true,
        expiresAt: true,
        answers: true,
        timePerQuestion: true,
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

    // 2. Fetch the latest un-synced state from Redis (if it exists)
    const REDIS_KEY = `exam:autosave:${attemptId}`
    let existingRedisData: any = null
    
    if (redis) {
      const rawRedisData = await redis.get(REDIS_KEY)
      if (rawRedisData) {
        existingRedisData = JSON.parse(rawRedisData)
      }
    }

    // 3. Merge Logic (Redis State -> Prisma State -> Incoming Changes)
    // We prioritize what's in Redis, fallback to Prisma, then apply new answers
    const currentAnswers = existingRedisData?.answers || (attempt.answers as Record<string, any>) || {}
    const timestamp = new Date().toISOString()

    newAnswers.forEach(answer => {
      currentAnswers[answer.questionId] = {
        selectedOption: answer.selectedOption ?? null,
        numericalAnswer: answer.numericalAnswer ?? null,
        markedForReview: answer.markedForReview || false,
        answeredAt: timestamp,
      }
    })

    const currentTimeMap = existingRedisData?.timePerQuestion || (attempt.timePerQuestion as Record<string, number>) || {}
    let mergedTime = { ...currentTimeMap }

    if (incomingTime) {
      for (const [qId, seconds] of Object.entries(incomingTime)) {
        mergedTime[qId] = Math.max(mergedTime[qId] || 0, seconds)
      }
    }

    // 4. Save to Redis INSTEAD of Prisma (The massive performance boost)
    if (redis) {
      const payloadToCache = {
        attemptId: attemptId,
        answers: currentAnswers,
        timePerQuestion: mergedTime,
        updatedAt: Date.now()
      }
      
      // Save the specific attempt data
      await redis.set(REDIS_KEY, JSON.stringify(payloadToCache), 'EX', 86400) // 24hr expiry
      
      // Add this attemptId to a Redis "Set" so our background worker knows which attempts have unsynced data
      await redis.sadd('exam:pending_sync_attempts', attemptId)
      
    } else {
      // Fallback if Redis is down: write directly to DB to prevent data loss
      await prisma.attempt.update({
        where: { id: attemptId },
        data: { answers: currentAnswers, timePerQuestion: mergedTime },
      })
    }

    return NextResponse.json({
      success: true,
      saved: newAnswers.length,
      method: redis ? 'redis-cache' : 'database-direct'
    })

  } catch (error) {
    return handleApiError(error)
  }
}