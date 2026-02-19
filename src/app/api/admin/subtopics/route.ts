// src/app/api/admin/subtopics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-error'
import { generateSlug } from '@/lib/validations'
import { z } from 'zod'

const createSubTopicSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().optional(),
  topicId: z.string().min(1),
  sequence: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

/**
 * GET /api/admin/subtopics
 * List all subtopics (optionally filter by topicId)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const topicId = searchParams.get('topicId')
    const search = searchParams.get('search') || ''
    const isActive = searchParams.get('isActive')

    const where: any = {}

    if (topicId) {
      where.topicId = topicId
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    const subTopics = await prisma.subTopic.findMany({
      where,
      include: {
        topic: {
          select: {
            id: true,
            name: true,
            subjectId: true,
          },
        },
        _count: {
          select: {
            questions: true,
          },
        },
      },
      orderBy: [
        { topicId: 'asc' },
        { sequence: 'asc' },
      ],
    })

    const response = subTopics.map(st => ({
      id: st.id,
      name: st.name,
      slug: st.slug,
      topicId: st.topicId,
      topicName: st.topic.name,
      subjectId: st.topic.subjectId,
      sequence: st.sequence,
      isActive: st.isActive,
      questionsCount: st._count.questions,
      createdAt: st.createdAt.toISOString(),
    }))

    return NextResponse.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/admin/subtopics
 * Create a new subtopic
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()

    if (!body.slug && body.name) {
      body.slug = generateSlug(body.name)
    }

    const validated = createSubTopicSchema.parse(body)

    // Check topic exists
    const topic = await prisma.topic.findUnique({
      where: { id: validated.topicId },
    })

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      )
    }

    // Check uniqueness within topic
    const existing = await prisma.subTopic.findUnique({
      where: {
        topicId_name: {
          topicId: validated.topicId,
          name: validated.name,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'SubTopic with this name already exists in this topic' },
        { status: 409 }
      )
    }

    const subTopic = await prisma.subTopic.create({
      data: {
        name: validated.name,
        slug: validated.slug ?? generateSlug(validated.name),
        topicId: validated.topicId,
        sequence: validated.sequence ?? 0,
        isActive: validated.isActive ?? true,
      },
      include: {
        topic: {
          select: {
            id: true,
            name: true,
            subjectId: true,
          },
        },
        _count: {
          select: {
            questions: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
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
      },
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}