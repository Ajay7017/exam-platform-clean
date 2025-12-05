// src/app/api/admin/subjects/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { handleApiError, ApiError } from '@/lib/api-error'
import { updateSubjectSchema } from '@/lib/validations'

/**
 * GET /api/admin/subjects/[id]
 * Get single subject details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const subject = await prisma.subject.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            topics: true,
            exams: true,
          },
        },
      },
    })

    if (!subject) {
      throw new ApiError('Subject not found', 404, 'NOT_FOUND')
    }

    return NextResponse.json({
      id: subject.id,
      name: subject.name,
      slug: subject.slug,
      description: subject.description,
      isActive: subject.isActive,
      topicsCount: subject._count.topics,
      examsCount: subject._count.exams,
      createdAt: subject.createdAt.toISOString(),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * PUT /api/admin/subjects/[id]
 * Update subject
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const body = await request.json()
    const validated = updateSubjectSchema.parse(body)

    // Check if subject exists
    const existing = await prisma.subject.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      throw new ApiError('Subject not found', 404, 'NOT_FOUND')
    }

    // If slug is being updated, check uniqueness
    if (validated.slug && validated.slug !== existing.slug) {
      const slugExists = await prisma.subject.findUnique({
        where: { slug: validated.slug },
      })

      if (slugExists) {
        return NextResponse.json(
          { error: 'Subject with this slug already exists' },
          { status: 409 }
        )
      }
    }

    // Update subject
    const subject = await prisma.subject.update({
      where: { id: params.id },
      data: validated,
      include: {
        _count: {
          select: {
            topics: true,
            exams: true,
          },
        },
      },
    })

    return NextResponse.json({
      id: subject.id,
      name: subject.name,
      slug: subject.slug,
      description: subject.description,
      isActive: subject.isActive,
      topicsCount: subject._count.topics,
      examsCount: subject._count.exams,
      createdAt: subject.createdAt.toISOString(),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/admin/subjects/[id]
 * Delete subject (only if no topics/exams)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    // Check if subject exists
    const subject = await prisma.subject.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            topics: true,
            exams: true,
          },
        },
      },
    })

    if (!subject) {
      throw new ApiError('Subject not found', 404, 'NOT_FOUND')
    }

    // Prevent deletion if has topics or exams
    if (subject._count.topics > 0 || subject._count.exams > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete subject with ${subject._count.topics} topics and ${subject._count.exams} exams`,
          code: 'HAS_DEPENDENCIES',
        },
        { status: 400 }
      )
    }

    // Delete subject
    await prisma.subject.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}