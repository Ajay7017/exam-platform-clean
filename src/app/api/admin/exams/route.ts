// src/app/api/admin/exams/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { examFiltersSchema, createExamSchema } from '@/lib/validations/exam'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const subjectSlug = searchParams.get('subject') || undefined
    const difficulty = searchParams.get('difficulty') as 'easy' | 'medium' | 'hard' | undefined
    const search = searchParams.get('search') || undefined
    const isPublishedParam = searchParams.get('isPublished')
    const isPublished = isPublishedParam === 'true' ? true : isPublishedParam === 'false' ? false : undefined
    // NEW: tag filter
    const tag = searchParams.get('tag') || undefined

    const skip = (page - 1) * limit

    const where: any = {}

    if (subjectSlug) {
      where.subject = { slug: subjectSlug }
    }

    if (difficulty) {
      where.difficulty = difficulty
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (isPublished !== undefined) {
      where.isPublished = isPublished
    }

    // NEW: filter by tag (tags is a String[] column)
    if (tag) {
      where.tags = { has: tag }
    }

    const [exams, totalCount] = await Promise.all([
      prisma.exam.findMany({
        where,
        skip,
        take: limit,
        include: {
          subject: true,
          _count: {
            select: {
              questions: true,
              attempts: true,
              purchases: {
                where: { status: 'active' },
              },
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.exam.count({ where })
    ])

    // NEW: collect all unique tags across ALL exams (for the tag filter dropdown)
    const allExams = await prisma.exam.findMany({
      select: { tags: true }
    })
    const allTags = Array.from(
      new Set(allExams.flatMap(e => e.tags))
    ).sort()

    const transformedExams = exams.map(exam => ({
      id: exam.id,
      title: exam.title,
      slug: exam.slug,
      thumbnail: exam.thumbnail ?? null,
      subject: exam.subject?.name || 'Multi-Subject',
      subjectSlug: exam.subject?.slug || 'multi-subject',
      isMultiSubject: exam.isMultiSubject,
      duration: exam.durationMin,
      totalQuestions: exam._count.questions,
      totalMarks: exam.totalMarks,
      difficulty: exam.difficulty,
      price: exam.price,
      isFree: exam.isFree,
      isPublished: exam.isPublished,
      totalAttempts: exam._count.attempts,
      totalPurchases: exam._count.purchases,
      instructions: exam.instructions,
      randomizeOrder: exam.randomizeOrder,
      allowReview: exam.allowReview,
      tags: exam.tags,           // NEW
      createdAt: exam.createdAt.toISOString(),
      updatedAt: exam.updatedAt.toISOString()
    }))

    return NextResponse.json({
      exams: transformedExams,
      allTags,                   // NEW: for populating filter dropdowns
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + exams.length < totalCount
      }
    })

  } catch (error) {
    console.error('GET /api/admin/exams error:', error)
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const validated = createExamSchema.parse(body)

    const existingExam = await prisma.exam.findUnique({
      where: { slug: validated.slug }
    })

    if (existingExam) {
      return NextResponse.json(
        { error: 'An exam with this slug already exists' },
        { status: 400 }
      )
    }

    if (!validated.isMultiSubject && validated.subjectId) {
      const subject = await prisma.subject.findUnique({
        where: { id: validated.subjectId }
      })

      if (!subject) {
        return NextResponse.json(
          { error: 'Subject not found' },
          { status: 404 }
        )
      }
    }

    const questions = await prisma.question.findMany({
      where: { id: { in: validated.questionIds } },
      select: { id: true, marks: true }
    })

    if (questions.length === 0) {
  return NextResponse.json(
    { error: 'No valid questions found' },
    { status: 400 }
  )
}

    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0)

    const exam = await prisma.exam.create({
      data: {
        title: validated.title,
        slug: validated.slug,
        subjectId: validated.subjectId || null,
        isMultiSubject: validated.isMultiSubject || false,
        durationMin: validated.durationMin,
        totalMarks,
        price: validated.price,
        isFree: validated.isFree || validated.price === 0,
        isPaid: validated.price > 0,
        instructions: validated.instructions,
        randomizeOrder: validated.randomizeOrder ?? false,
        allowReview: validated.allowReview ?? true,
        difficulty: validated.difficulty ?? 'medium',
        thumbnail: validated.thumbnail,
        isPublished: false,
        tags: validated.tags ?? [],   // NEW
        questions: {
          create: validated.questionIds.map((questionId, index) => ({
            questionId,
            sequence: index
          }))
        }
      },
      include: {
        ...(validated.subjectId && {
          subject: {
            select: { id: true, name: true, slug: true }
          }
        }),
        _count: {
          select: { questions: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Exam created successfully',
      exam: {
        id: exam.id,
        title: exam.title,
        slug: exam.slug,
        subject: exam.subject || null,
        isMultiSubject: exam.isMultiSubject,
        duration: exam.durationMin,
        totalQuestions: exam._count.questions,
        totalMarks: exam.totalMarks,
        difficulty: exam.difficulty,
        price: exam.price,
        isFree: exam.isFree,
        isPublished: exam.isPublished,
        tags: exam.tags,               // NEW
        createdAt: exam.createdAt.toISOString()
      }
    }, { status: 201 })

  } catch (error) {
    return handleApiError(error)
  }
}