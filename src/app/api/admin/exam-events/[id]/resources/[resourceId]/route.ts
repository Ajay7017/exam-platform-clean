// src/app/api/admin/exam-events/[id]/resources/[resourceId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { updateExamEventResourceSchema } from '@/lib/validations/exam-event'
import { deletePDF } from '@/lib/cloudinary'

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
        ...(validated.fileUrl !== undefined && { fileUrl: validated.fileUrl ?? null }),
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

    // If resource has a Cloudinary PDF, delete it first
    if (resource.fileUrl) {
      try {
        // Extract publicId from Cloudinary URL
        // URL format: https://res.cloudinary.com/cloud/raw/upload/v123/exam-pdfs/filename
        const urlParts = resource.fileUrl.split('/')
        const uploadIndex = urlParts.indexOf('upload')
        if (uploadIndex !== -1) {
          // Skip the version segment (v123) and join the rest without extension
          const pathParts = urlParts.slice(uploadIndex + 2)
          const publicId = pathParts.join('/').replace(/\.[^/.]+$/, '')
          await deletePDF(publicId)
        }
      } catch (err) {
        // Log but don't block deletion — DB record must still be removed
        console.error('Failed to delete PDF from Cloudinary:', err)
      }
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