import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { updateExamEventResourceSchema } from '@/lib/validations/exam-event'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; resourceId: string } }
) {
  try {
    await requireAdmin()

    const resource = await prisma.examEventResource.findFirst({
      where: {
        id: params.resourceId,
        examEventId: params.id
      }
    })

    if (!resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validated = updateExamEventResourceSchema.parse(body)

    const updated = await prisma.examEventResource.update({
      where: { id: params.resourceId },
      data: {
        ...(validated.label !== undefined && { label: validated.label }),
        ...(validated.type !== undefined && { type: validated.type }),
        ...(validated.driveLink !== undefined && { driveLink: validated.driveLink ?? null }),
        ...(validated.status !== undefined && { status: validated.status }),
        ...(validated.sortOrder !== undefined && { sortOrder: validated.sortOrder }),
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Resource updated successfully',
      resource: updated
    })

  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; resourceId: string } }
) {
  try {
    await requireAdmin()

    const resource = await prisma.examEventResource.findFirst({
      where: {
        id: params.resourceId,
        examEventId: params.id
      }
    })

    if (!resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      )
    }

    await prisma.examEventResource.delete({
      where: { id: params.resourceId }
    })

    return NextResponse.json({
      success: true,
      message: 'Resource deleted successfully'
    })

  } catch (error) {
    return handleApiError(error)
  }
}