// src/app/api/admin/feedback/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const AdminReplySchema = z.object({
  type:       z.enum(['feedback', 'error']),
  status:     z.enum(['pending', 'acknowledged', 'fixed']),
  adminReply: z.string().min(1).max(2000).optional(),
})

// PATCH — admin replies and/or updates status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    const body = await request.json()
    const data = AdminReplySchema.parse(body)

    const updatePayload = {
      status:     data.status,
      adminReply: data.adminReply,
      repliedAt:  data.adminReply ? new Date() : undefined,
    }

    if (data.type === 'feedback') {
      const feedback = await prisma.examFeedback.findUnique({
        where:  { id: params.id },
        select: { id: true }
      })
      if (!feedback) {
        return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
      }
      const updated = await prisma.examFeedback.update({
        where: { id: params.id },
        data:  updatePayload,
      })
      return NextResponse.json({ success: true, feedback: updated })
    }

    if (data.type === 'error') {
      const report = await prisma.errorReport.findUnique({
        where:  { id: params.id },
        select: { id: true }
      })
      if (!report) {
        return NextResponse.json({ error: 'Error report not found' }, { status: 404 })
      }
      const updated = await prisma.errorReport.update({
        where: { id: params.id },
        data:  updatePayload,
      })
      return NextResponse.json({ success: true, report: updated })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    return handleApiError(error)
  }
}