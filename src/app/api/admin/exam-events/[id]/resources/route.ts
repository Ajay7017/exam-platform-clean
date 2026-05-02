// src/app/api/admin/exam-events/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { createExamEventResourceSchema } from '@/lib/validations/exam-event'

export async function GET(
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

    const resources = await prisma.examEventResource.findMany({
      where: { examEventId: params.id },
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json({ resources })

  } catch (error) {
    console.error('GET /api/admin/exam-events/[id]/resources error:', error)
    return handleApiError(error)
  }
}

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

    const body = await request.json()
    const validated = createExamEventResourceSchema.parse(body)

    const resource = await prisma.examEventResource.create({
      data: {
        examEventId: params.id,
        label: validated.label,
        type: validated.type,
        driveLink: validated.driveLink ?? null,
        fileUrl: validated.fileUrl ?? null,
        status: validated.status,
        sortOrder: validated.sortOrder,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Resource added successfully',
      resource
    }, { status: 201 })

  } catch (error) {
    return handleApiError(error)
  }
}