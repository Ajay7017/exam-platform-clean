// src/app/api/admin/practice-exams/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const [practiceExams, totalCount] = await Promise.all([
      prisma.practiceExam.findMany({
        skip,
        take: limit,
        include: {
          subject: { select: { id: true, name: true, slug: true } },
          _count: { select: { questions: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.practiceExam.count()
    ])

    return NextResponse.json({
      practiceExams: practiceExams.map(exam => ({
        id: exam.id,
        title: exam.title,
        slug: exam.slug,
        description: exam.description ?? null,
        subject: exam.subject,
        questionCount: exam._count.questions,
        status: exam.status,
        createdAt: exam.createdAt.toISOString(),
        updatedAt: exam.updatedAt.toISOString()
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + practiceExams.length < totalCount
      }
    })

  } catch (error) {
    console.error('GET /api/admin/practice-exams error:', error)
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const { title, description, subjectId, questionIds } = body

    // Basic validation
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!subjectId || typeof subjectId !== 'string') {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one question is required' },
        { status: 400 }
      )
    }

    // Verify subject exists
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId }
    })

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      )
    }

    // Verify all questions exist
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true }
    })

    if (questions.length !== questionIds.length) {
      return NextResponse.json(
        { error: 'One or more questions not found in question bank' },
        { status: 400 }
      )
    }

    // Generate unique slug
    let slug = generateSlug(title)
    const existingSlug = await prisma.practiceExam.findUnique({ where: { slug } })
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`
    }

    const practiceExam = await prisma.practiceExam.create({
      data: {
        title: title.trim(),
        slug,
        description: description?.trim() || null,
        subjectId,
        questionCount: questionIds.length,
        status: 'DRAFT',
        questions: {
          create: questionIds.map((questionId: string, index: number) => ({
            questionId,
            order: index
          }))
        }
      },
      include: {
        subject: { select: { id: true, name: true, slug: true } },
        _count: { select: { questions: true } }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Practice exam created successfully',
      practiceExam: {
        id: practiceExam.id,
        title: practiceExam.title,
        slug: practiceExam.slug,
        description: practiceExam.description ?? null,
        subject: practiceExam.subject,
        questionCount: practiceExam._count.questions,
        status: practiceExam.status,
        createdAt: practiceExam.createdAt.toISOString()
      }
    }, { status: 201 })

  } catch (error) {
    return handleApiError(error)
  }
}