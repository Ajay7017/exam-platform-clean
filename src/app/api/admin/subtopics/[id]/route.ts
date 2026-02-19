// src/app/api/admin/subtopics/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-error'
import { generateSlug } from '@/lib/validations'
import { z } from 'zod'

const updateSubTopicSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().optional(),
  sequence: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

/**
 * PATCH /api/admin/subtopics/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const body = await request.json()
    const validated = updateSubTopicSchema.parse(body)

    if (validated.name && !validated.slug) {
      validated.slug = generateSlug(validated.name)
    }

    const subTopic = await prisma.subTopic.update({
      where: { id: params.id },
      data: validated,
      include: {
        topic: { select: { id: true, name: true, subjectId: true } },
        _count: { select: { questions: true } },
      },
    })

    return NextResponse.json({
      id: subTopic.id,
      name: subTopic.name,
      slug: subTopic.slug,
      topicId: subTopic.topicId,
      topicName: subTopic.topic.name,
      subjectId: subTopic.topic.subjectId,
      sequence: subTopic.sequence,
      isActive: subTopic.isActive,
      questionsCount: subTopic._count.questions,
      createdAt: subTopic.createdAt.toISOString(),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/admin/subtopics/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const count = await prisma.question.count({
      where: { subTopicId: params.id },
    })

    if (count > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${count} question(s) are linked to this subtopic` },
        { status: 409 }
      )
    }

    await prisma.subTopic.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}