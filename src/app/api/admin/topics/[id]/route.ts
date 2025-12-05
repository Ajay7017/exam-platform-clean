// src/app/api/admin/topics/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { handleApiError, ApiError } from '@/lib/api-error'
import { updateTopicSchema } from '@/lib/validations'

/**
 * GET /api/admin/topics/[id]
 * Get single topic details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const topic = await prisma.topic.findUnique({
      where: { id: params.id },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            questions: true,
          },
        },
      },
    })

    if (!topic) {
      throw new ApiError('Topic not found', 404, 'NOT_FOUND')
    }

    return NextResponse.json({
      id: topic.id,
      name: topic.name,
      slug: topic.slug,
      subjectId: topic.subjectId,
      subjectName: topic.subject.name,
      sequence: topic.sequence,
      isActive: topic.isActive,
      questionsCount: topic._count.questions,
      createdAt: topic.createdAt.toISOString(),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * PUT /api/admin/topics/[id]
 * Update topic
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const body = await request.json()
    const validated = updateTopicSchema.parse(body)

    // Check if topic exists
    const existing = await prisma.topic.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      throw new ApiError('Topic not found', 404, 'NOT_FOUND')
    }

    // If name is being updated, check uniqueness in subject
    if (validated.name && validated.name !== existing.name) {
      const subjectId = validated.subjectId || existing.subjectId

      const nameExists = await prisma.topic.findUnique({
        where: {
          subjectId_name: {
            subjectId,
            name: validated.name,
          },
        },
      })

      if (nameExists && nameExists.id !== params.id) {
        return NextResponse.json(
          { error: 'Topic with this name already exists in this subject' },
          { status: 409 }
        )
      }
    }

    // Update topic
    const topic = await prisma.topic.update({
      where: { id: params.id },
      data: validated,
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            questions: true,
          },
        },
      },
    })

    return NextResponse.json({
      id: topic.id,
      name: topic.name,
      slug: topic.slug,
      subjectId: topic.subjectId,
      subjectName: topic.subject.name,
      sequence: topic.sequence,
      isActive: topic.isActive,
      questionsCount: topic._count.questions,
      createdAt: topic.createdAt.toISOString(),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/admin/topics/[id]
 * Delete topic (only if no questions)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    // Check if topic exists
    const topic = await prisma.topic.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            questions: true,
          },
        },
      },
    })

    if (!topic) {
      throw new ApiError('Topic not found', 404, 'NOT_FOUND')
    }

    // Prevent deletion if has questions
    if (topic._count.questions > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete topic with ${topic._count.questions} questions`,
          code: 'HAS_QUESTIONS',
        },
        { status: 400 }
      )
    }

    // Delete topic
    await prisma.topic.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}