// src/app/api/practice-exams/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('subject') || undefined

    const where: any = {
      status: 'PUBLISHED',
      ...(subjectId && { subjectId })
    }

    const practiceExams = await prisma.practiceExam.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true, slug: true } },
        _count: { select: { questions: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Only return subjects that have at least 1 published practice exam
    // Used by frontend to populate subject filter tabs
    const subjectsWithExams = await prisma.practiceExam.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        subject: { select: { id: true, name: true, slug: true } }
      },
      distinct: ['subjectId']
    })

    return NextResponse.json({
      practiceExams: practiceExams.map(exam => ({
        id: exam.id,
        title: exam.title,
        slug: exam.slug,
        description: exam.description ?? null,
        subject: exam.subject,
        questionCount: exam._count.questions,
      })),
      subjects: subjectsWithExams.map(e => e.subject)
    })

  } catch (error) {
    console.error('GET /api/practice-exams error:', error)
    return handleApiError(error)
  }
}