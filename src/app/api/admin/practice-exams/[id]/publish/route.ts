// src/app/api/admin/practice-exams/[id]/publish/route.ts
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

    const practiceExam = await prisma.practiceExam.findUnique({
      where: { id: params.id },
      include: { _count: { select: { questions: true } } }
    })

    if (!practiceExam) {
      return NextResponse.json(
        { error: 'Practice exam not found' },
        { status: 404 }
      )
    }

    // Safety check — don't publish empty exams
    if (practiceExam._count.questions === 0) {
      return NextResponse.json(
        { error: 'Cannot publish a practice exam with no questions' },
        { status: 400 }
      )
    }

    // Toggle status
    const newStatus = practiceExam.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'

    const updated = await prisma.practiceExam.update({
      where: { id: params.id },
      data: { status: newStatus }
    })

    return NextResponse.json({
      success: true,
      message: `Practice exam ${newStatus === 'PUBLISHED' ? 'published' : 'unpublished'} successfully`,
      status: updated.status
    })

  } catch (error) {
    return handleApiError(error)
  }
}