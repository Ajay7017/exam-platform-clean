import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { createExamEventSchema } from '@/lib/validations/exam-event'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const [examEvents, totalCount] = await Promise.all([
      prisma.examEvent.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { resources: true }
          }
        }
      }),
      prisma.examEvent.count()
    ])

    const transformed = examEvents.map(event => ({
      id: event.id,
      title: event.title,
      slug: event.slug,
      examDate: event.examDate?.toISOString() ?? null,
      status: event.status,
      popupEnabled: event.popupEnabled,
      resourceCount: event._count.resources,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    }))

    return NextResponse.json({
      examEvents: transformed,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })

  } catch (error) {
    console.error('GET /api/admin/exam-events error:', error)
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const validated = createExamEventSchema.parse(body)

    // Check slug uniqueness
    const existing = await prisma.examEvent.findUnique({
      where: { slug: validated.slug }
    })
    if (existing) {
      return NextResponse.json(
        { error: 'An exam event with this slug already exists' },
        { status: 400 }
      )
    }

    const examEvent = await prisma.examEvent.create({
      data: {
        title: validated.title,
        slug: validated.slug,
        description: validated.description ?? null,
        examDate: validated.examDate ? new Date(validated.examDate) : null,
        calculatorEnabled: validated.calculatorEnabled,
        totalQuestions: validated.totalQuestions,
        totalMarks: validated.totalMarks,
        correctMarks: validated.correctMarks,
        negativeMarks: validated.negativeMarks,
        cutoffGeneral: validated.cutoffGeneral ?? null,
        cutoffOBC: validated.cutoffOBC ?? null,
        cutoffSC: validated.cutoffSC ?? null,
        cutoffST: validated.cutoffST ?? null,
        metaTitle: validated.metaTitle ?? null,
        metaDescription: validated.metaDescription ?? null,
        popupEnabled: validated.popupEnabled,
        popupMessage: validated.popupMessage ?? null,
        popupLinkLabel: validated.popupLinkLabel ?? null,
        status: 'DRAFT',
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Exam event created successfully',
      examEvent
    }, { status: 201 })

  } catch (error) {
    return handleApiError(error)
  }
}