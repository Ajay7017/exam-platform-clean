import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

// Lightweight polling endpoint — returns only what the frontend needs.
// Called every 3 seconds from the "calculating results" waiting screen.
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session   = await requireAuth()
    const attemptId = params.id

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