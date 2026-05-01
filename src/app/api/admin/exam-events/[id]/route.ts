import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { updateExamEventSchema } from '@/lib/validations/exam-event'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const examEvent = await prisma.examEvent.findUnique({
      where: { id: params.id },
      include: {
        resources: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    if (!examEvent) {
      return NextResponse.json(
        { error: 'Exam event not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ examEvent })

  } catch (error) {
    console.error('GET /api/admin/exam-events/[id] error:', error)
    return handleApiError(error)
  }
}

export async function PUT(
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
    const validated = updateExamEventSchema.parse(body)

    // If slug is being changed, check uniqueness
    if (validated.slug && validated.slug !== examEvent.slug) {
      const slugExists = await prisma.examEvent.findUnique({
        where: { slug: validated.slug }
      })
      if (slugExists) {
        return NextResponse.json(
          { error: 'An exam event with this slug already exists' },
          { status: 400 }
        )
      }
    }

    const updated = await prisma.examEvent.update({
      where: { id: params.id },
      data: {
        ...(validated.title !== undefined && { title: validated.title }),
        ...(validated.slug !== undefined && { slug: validated.slug }),
        ...(validated.description !== undefined && { description: validated.description ?? null }),
        ...(validated.examDate !== undefined && { examDate: validated.examDate ? new Date(validated.examDate) : null }),
        ...(validated.calculatorEnabled !== undefined && { calculatorEnabled: validated.calculatorEnabled }),
        ...(validated.totalQuestions !== undefined && { totalQuestions: validated.totalQuestions }),
        ...(validated.totalMarks !== undefined && { totalMarks: validated.totalMarks }),
        ...(validated.correctMarks !== undefined && { correctMarks: validated.correctMarks }),
        ...(validated.negativeMarks !== undefined && { negativeMarks: validated.negativeMarks }),
        ...(validated.cutoffGeneral !== undefined && { cutoffGeneral: validated.cutoffGeneral ?? null }),
        ...(validated.cutoffOBC !== undefined && { cutoffOBC: validated.cutoffOBC ?? null }),
        ...(validated.cutoffSC !== undefined && { cutoffSC: validated.cutoffSC ?? null }),
        ...(validated.cutoffST !== undefined && { cutoffST: validated.cutoffST ?? null }),
        ...(validated.metaTitle !== undefined && { metaTitle: validated.metaTitle ?? null }),
        ...(validated.metaDescription !== undefined && { metaDescription: validated.metaDescription ?? null }),
        ...(validated.popupEnabled !== undefined && { popupEnabled: validated.popupEnabled }),
        ...(validated.popupMessage !== undefined && { popupMessage: validated.popupMessage ?? null }),
        ...(validated.popupLinkLabel !== undefined && { popupLinkLabel: validated.popupLinkLabel ?? null }),
      },
      include: {
        resources: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Exam event updated successfully',
      examEvent: updated
    })

  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
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

    // Resources cascade delete via schema (onDelete: Cascade)
    await prisma.examEvent.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Exam event deleted successfully'
    })

  } catch (error) {
    return handleApiError(error)
  }
}