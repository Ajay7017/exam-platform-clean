// src/app/api/student/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()

    // fetch latest reply timestamps for this student
    const [latestFeedback, latestError] = await Promise.all([
      prisma.examFeedback.findFirst({
        where: {
          userId:    session.user.id,
          adminReply: { not: null },
        },
        select:  { repliedAt: true },
        orderBy: { repliedAt: 'desc' },
      }),
      prisma.errorReport.findFirst({
        where: {
          userId:    session.user.id,
          adminReply: { not: null },
        },
        select:  { repliedAt: true },
        orderBy: { repliedAt: 'desc' },
      }),
    ])

    const hasNewReplies =
      latestFeedback?.repliedAt != null ||
      latestError?.repliedAt    != null

    // find the most recent reply across both models
    const dates = [
      latestFeedback?.repliedAt,
      latestError?.repliedAt,
    ].filter(Boolean) as Date[]

    const latestReplyAt = dates.length > 0
      ? new Date(Math.max(...dates.map(d => d.getTime()))).toISOString()
      : null

    return NextResponse.json({ hasNewReplies, latestReplyAt })
  } catch (error) {
    return handleApiError(error)
  }
}