import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { cache } from '@/lib/redis'

// Lightweight polling endpoint — returns only what the frontend needs.
// Called every 3 seconds from the "calculating results" waiting screen.
// Redis-first: zero DB queries on cache hit. Falls back to Postgres on miss.
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session   = await requireAuth()
    const attemptId = params.id

    // ── 1. Check Redis first — zero DB hit on cache hit ───────────────────
    // Worker writes { status, examId, userId } here after grading succeeds.
    // Ownership verified in memory — no Postgres needed.
    const cachedRaw = await cache.get(`attempt:status:${attemptId}`)
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw)
        if (cached.userId !== session.user.id) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }
        return NextResponse.json({
          attemptId,
          status: cached.status,
          graded: cached.status === 'graded',
          examId: cached.examId,
        })
      } catch {
        // Malformed cache value — fall through to Postgres
      }
    }

    // ── 2. Cache miss — fall back to Postgres ────────────────────────────
    // Happens while worker is still grading, or if Redis was unavailable.
    const attempt = await prisma.attempt.findUnique({
      where:  { id: attemptId },
      select: { userId: true, status: true, examId: true },
    })

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }
    if (attempt.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
      attemptId,
      status:  attempt.status,
      graded:  attempt.status === 'graded',
      examId:  attempt.examId,
    })

  } catch (error) {
    return handleApiError(error)
  }
}