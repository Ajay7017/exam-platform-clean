// src/app/api/admin/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

// GET — admin fetches all feedback + error reports
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const type     = searchParams.get('type')   || 'all' // 'feedback' | 'error' | 'all'
    const status   = searchParams.get('status') || 'all' // 'pending' | 'acknowledged' | 'fixed' | 'all'
    const examId   = searchParams.get('examId') || null
    const page     = parseInt(searchParams.get('page')  || '1')
    const limit    = parseInt(searchParams.get('limit') || '20')
    const skip     = (page - 1) * limit

    const statusFilter = status !== 'all' ? { status } : {}
    const examFilter   = examId           ? { examId } : {}

    const [feedbacks, errorReports] = await Promise.all([
      // only fetch feedbacks if type is 'all' or 'feedback'
      type !== 'error'
        ? prisma.examFeedback.findMany({
            where:   { ...statusFilter, ...examFilter },
            include: {
              user: { select: { id: true, name: true, email: true } },
              exam: { select: { id: true, title: true, slug: true } },
            },
            orderBy: { createdAt: 'desc' },
            // only paginate when fetching a single type
            ...(type === 'feedback' ? { skip, take: limit } : {}),
          })
        : [],

      // only fetch error reports if type is 'all' or 'error'
      type !== 'feedback'
        ? prisma.errorReport.findMany({
            where:   { ...statusFilter, ...examFilter },
            include: {
              user:     { select: { id: true, name: true, email: true } },
              exam:     { select: { id: true, title: true, slug: true } },
              question: { select: { id: true, statement: true } },
            },
            orderBy: { createdAt: 'desc' },
            // only paginate when fetching a single type
            ...(type === 'error' ? { skip, take: limit } : {}),
          })
        : [],
    ])

    // counts for admin dashboard badges
    const [pendingFeedbackCount, pendingErrorCount] = await Promise.all([
      prisma.examFeedback.count({ where: { status: 'pending' } }),
      prisma.errorReport.count({  where: { status: 'pending' } }),
    ])

    return NextResponse.json({
      feedbacks,
      errorReports,
      meta: {
        pendingFeedbackCount,
        pendingErrorCount,
        totalPending: pendingFeedbackCount + pendingErrorCount,
      }
    })
  } catch (error) {
    return handleApiError(error)
  }
}