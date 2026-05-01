import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const examEvent = await prisma.examEvent.findUnique({
      where: { id: params.id }
    })

    if (!examEvent) {
      return NextResponse.json(
        { error: 'Exam event not found' },
        { status: 404 }
      )
    }

    // Toggle DRAFT ↔ PUBLISHED
    const newStatus = examEvent.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'

    const updated = await prisma.examEvent.update({
      where: { id: params.id },
      data: { status: newStatus }
    })

    return NextResponse.json({
      success: true,
      message: `Exam event ${newStatus === 'PUBLISHED' ? 'published' : 'unpublished'} successfully`,
      status: updated.status
    })

  } catch (error) {
    return handleApiError(error)
  }
}