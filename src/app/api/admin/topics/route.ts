// src/app/api/admin/topics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-error'
import { createTopicSchema, generateSlug } from '@/lib/validations'

/**
 * GET /api/admin/topics
 * List all topics (optionally filter by subject)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('subjectId')
    const search = searchParams.get('search') || ''
    const isActive = searchParams.get('isActive')

    // Build where clause
    const where: any = {}

    if (subjectId) {
      where.subjectId = subjectId
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

    const topics = await prisma.topic.findMany({
      where,
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
      orderBy: [
        { subjectId: 'asc' },
        { sequence: 'asc' },
      ],
    })

    // Transform response
    const response = topics.map(topic => ({
      id: topic.id,
      name: topic.name,
      slug: topic.slug,
      subjectId: topic.subjectId,
      subjectName: topic.subject.name,
      sequence: topic.sequence,
      isActive: topic.isActive,
      questionsCount: topic._count.questions,
      createdAt: topic.createdAt.toISOString(),
    }))

    return NextResponse.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/admin/topics
 * Create a new topic
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()

    // If slug not provided, generate from name
    if (!body.slug && body.name) {
      body.slug = generateSlug(body.name)
    }

    // Validate
    const validated = createTopicSchema.parse(body)

    // Check if subject exists
    const subject = await prisma.subject.findUnique({
      where: { id: validated.subjectId },
    })

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      )
    }

    // Check if topic name already exists in this subject
    const existing = await prisma.topic.findUnique({
      where: {
        subjectId_name: {
          subjectId: validated.subjectId,
          name: validated.name,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Topic with this name already exists in this subject' },
        { status: 409 }
      )
    }

    // Create topic
    const topic = await prisma.topic.create({
      data: {
        name: validated.name,
        slug: validated.slug,
        subjectId: validated.subjectId,
        sequence: validated.sequence ?? 0,
        isActive: validated.isActive ?? true,
      },
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

    return NextResponse.json(
      {
        id: topic.id,
        name: topic.name,
        slug: topic.slug,
        subjectId: topic.subjectId,
        subjectName: topic.subject.name,
        sequence: topic.sequence,
        isActive: topic.isActive,
        questionsCount: topic._count.questions,
        createdAt: topic.createdAt.toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}