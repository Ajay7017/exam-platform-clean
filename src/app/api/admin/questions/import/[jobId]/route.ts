// src/app/api/admin/questions/import/[jobId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    await requireAdmin()

    const { jobId } = await context.params

    const job = await prisma.importJob.findUnique({
      where: { id: jobId }
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Import job not found' },
        { status: 404 }
      )
    }

    const progress = job.totalQuestions > 0
      ? Math.round(((job.successCount + job.failedCount) / job.totalQuestions) * 100)
      : 0

    return NextResponse.json({
      id: job.id,
      status: job.status,
      totalQuestions: job.totalQuestions,
      successCount: job.successCount,
      failedCount: job.failedCount,
      progress,
      errors: job.errors || [],
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    })
  } catch (error) {
    console.error('GET JOB STATUS ERROR:', error)
    return handleApiError(error)
  }
}