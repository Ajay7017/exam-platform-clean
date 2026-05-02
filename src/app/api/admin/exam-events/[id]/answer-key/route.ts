// src/app/api/admin/exam-events/[id]/answer-key/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { answerKeySchema } from '@/lib/validations/exam-event'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const answerKey = await prisma.examEventAnswerKey.findUnique({
      where: { examEventId: params.id }
    })

    return NextResponse.json({ answerKey })

  } catch (error) {
    console.error('GET /api/admin/exam-events/[id]/answer-key error:', error)
    return handleApiError(error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const examEvent = await prisma.examEvent.findUnique({
      where: { id: params.id }
    })

    if (!examEvent) {
      return NextResponse.json(
        { error: 'Exam event not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validated = answerKeySchema.parse(body)

    const answerKey = await prisma.examEventAnswerKey.upsert({
      where: { examEventId: params.id },
      create: {
        examEventId: params.id,
        sections: validated.sections,
        questions: validated.questions,
      },
      update: {
        sections: validated.sections,
        questions: validated.questions,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Answer key saved successfully',
      answerKey,
    })

  } catch (error) {
    console.error('POST /api/admin/exam-events/[id]/answer-key error:', error)
    return handleApiError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const answerKey = await prisma.examEventAnswerKey.findUnique({
      where: { examEventId: params.id }
    })

    if (!answerKey) {
      return NextResponse.json(
        { error: 'Answer key not found' },
        { status: 404 }
      )
    }

    await prisma.examEventAnswerKey.delete({
      where: { examEventId: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Answer key deleted successfully',
    })

  } catch (error) {
    console.error('DELETE /api/admin/exam-events/[id]/answer-key error:', error)
    return handleApiError(error)
  }
}