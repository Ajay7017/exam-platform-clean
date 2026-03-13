// src/app/api/attempts/check/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const examId = searchParams.get('examId')

    if (!examId) {
      return NextResponse.json({ error: 'examId is required' }, { status: 400 })
    }

    const officialAttempt = await prisma.attempt.findFirst({
      where: {
        userId:     session.user.id,
        examId,
        status:     'completed',
        isOfficial: true,
      },
      select: { id: true }
    })

    return NextResponse.json({
      hasOfficialAttempt: !!officialAttempt
    })

  } catch (error) {
    return handleApiError(error)
  }
}