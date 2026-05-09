// src/app/api/admin/practice-exams/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const practiceExam = await prisma.practiceExam.findUnique({
      where: { id: params.id },
      include: {
        subject: { select: { id: true, name: true, slug: true } },
        questions: {
          orderBy: { order: 'asc' },
          include: {
            question: {
              include: {
                options: {
                  orderBy: { sequence: 'asc' }
                },
                topic: {
                  select: { id: true, name: true }
                }
              }
            }
          }
        }
      }
    })

    if (!practiceExam) {
      return NextResponse.json(
        { error: 'Practice exam not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      practiceExam: {
        id: practiceExam.id,
        title: practiceExam.title,
        slug: practiceExam.slug,
        description: practiceExam.description ?? null,
        subject: practiceExam.subject,
        questionCount: practiceExam.questionCount,
        status: practiceExam.status,
        questions: practiceExam.questions.map(pq => ({
          id: pq.question.id,
          statement: pq.question.statement,
          imageUrl: pq.question.imageUrl ?? null,
          explanation: pq.question.explanation ?? null,
          difficulty: pq.question.difficulty,
          topic: pq.question.topic,
          options: pq.question.options.map(o => ({
            id: o.id,
            text: o.text,
            optionKey: o.optionKey,
            isCorrect: o.isCorrect
          })),
          order: pq.order
        })),
        createdAt: practiceExam.createdAt.toISOString(),
        updatedAt: practiceExam.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('GET /api/admin/practice-exams/[id] error:', error)
    return handleApiError(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const practiceExam = await prisma.practiceExam.findUnique({
      where: { id: params.id }
    })

    if (!practiceExam) {
      return NextResponse.json(
        { error: 'Practice exam not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { title, description, subjectId, questionIds } = body

    // Validate subject if being changed
    if (subjectId && subjectId !== practiceExam.subjectId) {
      const subject = await prisma.subject.findUnique({
        where: { id: subjectId }
      })
      if (!subject) {
        return NextResponse.json(
          { error: 'Subject not found' },
          { status: 404 }
        )
      }
    }

    // Validate questions if being changed
    if (questionIds !== undefined) {
      if (!Array.isArray(questionIds) || questionIds.length === 0) {
        return NextResponse.json(
          { error: 'At least one question is required' },
          { status: 400 }
        )
      }

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
    }

    // Build update data
    const updateData: any = { updatedAt: new Date() }
    if (title !== undefined) updateData.title = title.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (subjectId !== undefined) updateData.subjectId = subjectId
    if (questionIds !== undefined) updateData.questionCount = questionIds.length

    // If questions are being replaced, delete old and insert new in transaction
    const updated = await prisma.$transaction(async (tx) => {
      if (questionIds !== undefined) {
        await tx.practiceExamQuestion.deleteMany({
          where: { practiceExamId: params.id }
        })
        await tx.practiceExamQuestion.createMany({
          data: questionIds.map((questionId: string, index: number) => ({
            practiceExamId: params.id,
            questionId,
            order: index
          }))
        })
      }

      return tx.practiceExam.update({
        where: { id: params.id },
        data: updateData,
        include: {
          subject: { select: { id: true, name: true, slug: true } },
          _count: { select: { questions: true } }
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Practice exam updated successfully',
      practiceExam: {
        id: updated.id,
        title: updated.title,
        slug: updated.slug,
        description: updated.description ?? null,
        subject: updated.subject,
        questionCount: updated._count.questions,
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString()
      }
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

    const practiceExam = await prisma.practiceExam.findUnique({
      where: { id: params.id }
    })

    if (!practiceExam) {
      return NextResponse.json(
        { error: 'Practice exam not found' },
        { status: 404 }
      )
    }

    // PracticeExamQuestion rows cascade delete automatically (onDelete: Cascade)
    await prisma.practiceExam.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Practice exam deleted successfully'
    })

  } catch (error) {
    return handleApiError(error)
  }
}