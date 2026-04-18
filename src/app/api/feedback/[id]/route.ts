// src/app/api/feedback/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

// DELETE — student deletes their own feedback
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session  = await requireAuth()
    const feedback = await prisma.examFeedback.findUnique({
      where:  { id: params.id },
      select: { userId: true, adminReply: true }
    })

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }
    if (feedback.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    // don't allow delete if admin already replied
    if (feedback.adminReply) {
      return NextResponse.json(
        { error: 'Cannot delete feedback that has an admin reply' },
        { status: 400 }
      )
    }

    await prisma.examFeedback.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}