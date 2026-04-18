// src/app/api/error-reports/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

// DELETE — student deletes their own error report
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    const report  = await prisma.errorReport.findUnique({
      where:  { id: params.id },
      select: { userId: true, adminReply: true }
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }
    if (report.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (report.adminReply) {
      return NextResponse.json(
        { error: 'Cannot delete a report that has an admin reply' },
        { status: 400 }
      )
    }

    await prisma.errorReport.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}