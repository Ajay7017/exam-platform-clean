// src/app/api/error-reports/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ErrorReportSchema = z.object({
  examId:         z.string().min(1),
  attemptId:      z.string().min(1),
  questionId:     z.string().min(1),
  questionNumber: z.number().int().min(1),
  issueType:      z.enum([
    'wrong_answer',
    'wrong_question',
    'typo',
    'image_issue',
    'other'
  ]),
  description: z.string().min(5).max(1000),
})

// POST — student submits error report
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body    = await request.json()
    const data    = ErrorReportSchema.parse(body)

    // verify attempt belongs to this student
    const attempt = await prisma.attempt.findUnique({
      where:  { id: data.attemptId },
      select: { userId: true, examId: true, hasSubmitted: true }
    })

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }
    if (attempt.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!attempt.hasSubmitted) {
      return NextResponse.json({ error: 'Exam not yet submitted' }, { status: 400 })
    }
    if (attempt.examId !== data.examId) {
      return NextResponse.json({ error: 'Exam mismatch' }, { status: 400 })
    }

    // verify question exists
    const question = await prisma.question.findUnique({
      where:  { id: data.questionId },
      select: { id: true }
    })
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const report = await prisma.errorReport.create({
      data: {
        userId:         session.user.id,
        examId:         data.examId,
        attemptId:      data.attemptId,
        questionId:     data.questionId,
        questionNumber: data.questionNumber,
        issueType:      data.issueType,
        description:    data.description,
      }
    })

    return NextResponse.json({ success: true, report }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

// GET — student gets all their error reports with admin replies
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()

    const reports = await prisma.errorReport.findMany({
      where:   { userId: session.user.id },
      include: {
        exam:     { select: { id: true, title: true, slug: true } },
        question: { select: { id: true, statement: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ reports })
  } catch (error) {
    return handleApiError(error)
  }
}