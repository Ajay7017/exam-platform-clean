// src/app/api/admin/subjects/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-error'
import { createSubjectSchema, generateSlug } from '@/lib/validations'

/**
 * GET /api/admin/subjects
 * List all subjects with topics count
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const isActive = searchParams.get('isActive')

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    const subjects = await prisma.subject.findMany({
      where,
      include: {
        _count: {
          select: {
            topics: true,
            exams: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Transform response
    const response = subjects.map(subject => ({
      id: subject.id,
      name: subject.name,
      slug: subject.slug,
      description: subject.description,
      isActive: subject.isActive,
      topicsCount: subject._count.topics,
      examsCount: subject._count.exams,
      createdAt: subject.createdAt.toISOString(),
    }))

    return NextResponse.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/admin/subjects
 * Create a new subject
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
    const validated = createSubjectSchema.parse(body)

    // Check if slug already exists
    const existing = await prisma.subject.findUnique({
      where: { slug: validated.slug },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Subject with this slug already exists' },
        { status: 409 }
      )
    }

    // Create subject
    const subject = await prisma.subject.create({
      data: {
        name: validated.name,
        slug: validated.slug,
        description: validated.description,
        isActive: validated.isActive ?? true,
      },
      include: {
        _count: {
          select: {
            topics: true,
            exams: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        id: subject.id,
        name: subject.name,
        slug: subject.slug,
        description: subject.description,
        isActive: subject.isActive,
        topicsCount: subject._count.topics,
        examsCount: subject._count.exams,
        createdAt: subject.createdAt.toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}