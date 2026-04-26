// src/app/api/admin/exams/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { cache } from '@/lib/redis'
import { updateExamSchema } from '@/lib/validations/exam'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    
    const exam = await prisma.exam.findUnique({
      where: { id: params.id },
      include: {
        subject: {
          select: { id: true, name: true, slug: true }
        },
        questions: {
          include: {
            question: {
              include: {
                topic: {
                  // ✅ added subjectId so edit page can derive selectedSubjects
                  select: { id: true, name: true, slug: true, subjectId: true }
                },
                options: {
                  orderBy: { sequence: 'asc' }
                }
              }
            }
          },
          orderBy: { sequence: 'asc' }
        },
        _count: {
          select: {
            attempts: true,
            purchases: true
          }
        }
      }
    })
    
    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      )
    }
    
    const questions = exam.questions.map(eq => ({
      id: eq.question.id,
      statement: eq.question.statement,
      imageUrl: eq.question.imageUrl,
      // ✅ expose subjectId — the edit page uses this to derive
      // which subjects are selected in a multi-subject exam
      subjectId: eq.question.topic.subjectId,
      topic: {
        id: eq.question.topic.id,
        name: eq.question.topic.name,
        slug: eq.question.topic.slug
      },
      marks: eq.question.marks,
      negativeMarks: eq.question.negativeMarks,
      difficulty: eq.question.difficulty,
      explanation: eq.question.explanation,
      sequence: eq.sequence,
      options: eq.question.options.map(opt => ({
        key: opt.optionKey,
        text: opt.text,
        imageUrl: opt.imageUrl,
        isCorrect: opt.isCorrect
      }))
    }))
    
    return NextResponse.json({
      id: exam.id,
      title: exam.title,
      slug: exam.slug,
      subject: exam.subject,
      isMultiSubject: exam.isMultiSubject,
      duration: exam.durationMin,
      totalMarks: exam.totalMarks,
      price: exam.price,
      isFree: exam.isFree,
      difficulty: exam.difficulty,
      thumbnail: exam.thumbnail,
      instructions: exam.instructions,
      randomizeOrder: exam.randomizeOrder,
      allowReview: exam.allowReview,
      isPublished: exam.isPublished,
      totalAttempts: exam._count.attempts,
      totalPurchases: exam._count.purchases,
      tags: exam.tags ?? [],
      questions,
      createdAt: exam.createdAt.toISOString(),
      updatedAt: exam.updatedAt.toISOString()
    })
    
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    
    const body = await request.json()
    const validated = updateExamSchema.parse({ ...body, id: params.id })
    
    const existingExam = await prisma.exam.findUnique({
      where: { id: params.id }
    })
    
    if (!existingExam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      )
    }
    
    if (validated.slug && validated.slug !== existingExam.slug) {
      const slugConflict = await prisma.exam.findUnique({
        where: { slug: validated.slug }
      })
      
      if (slugConflict) {
        return NextResponse.json(
          { error: 'An exam with this slug already exists' },
          { status: 400 }
        )
      }
    }
    
    let totalMarks = existingExam.totalMarks
    
    if (validated.questionIds) {
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
      
      totalMarks = questions.reduce((sum, q) => sum + q.marks, 0)
    }
    
    const updateData: any = {}
    
    if (validated.title) updateData.title = validated.title
    if (validated.slug) updateData.slug = validated.slug
    if (validated.subjectId) updateData.subjectId = validated.subjectId
    if (validated.durationMin) updateData.durationMin = validated.durationMin
    if (validated.price !== undefined) {
      updateData.price = validated.price
      updateData.isFree = validated.price === 0
    }
    if (validated.instructions !== undefined) updateData.instructions = validated.instructions
    if (validated.randomizeOrder !== undefined) updateData.randomizeOrder = validated.randomizeOrder
    if (validated.allowReview !== undefined) updateData.allowReview = validated.allowReview
    if (validated.difficulty) updateData.difficulty = validated.difficulty
    if (validated.thumbnail !== undefined) updateData.thumbnail = validated.thumbnail
    if (validated.tags !== undefined) updateData.tags = validated.tags
    
    updateData.totalMarks = totalMarks
    
    if (validated.questionIds) {
      await prisma.examQuestion.deleteMany({
        where: { examId: params.id }
      })
      
      updateData.questions = {
        create: validated.questionIds.map((questionId, index) => ({
          questionId,
          sequence: index
        }))
      }
    }
    
    const exam = await prisma.exam.update({
      where: { id: params.id },
      data: updateData,
      include: {
        subject: {
          select: { id: true, name: true, slug: true }
        },
        _count: {
          select: { questions: true }
        }
      }
    })

    try {
      await cache.del(`exam:start-payload:${params.id}`)
    } catch (e) {
      console.warn('[Cache] Failed to invalidate exam cache on update:', e)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Exam updated successfully',
      exam: {
        id: exam.id,
        title: exam.title,
        slug: exam.slug,
        subject: exam.subject,
        duration: exam.durationMin,
        totalQuestions: exam._count.questions,
        totalMarks: exam.totalMarks,
        difficulty: exam.difficulty,
        price: exam.price,
        isFree: exam.isFree,
        isPublished: exam.isPublished,
        tags: exam.tags,
        updatedAt: exam.updatedAt.toISOString()
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
    
    const exam = await prisma.exam.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { attempts: true, purchases: true }
        }
      }
    })
    
    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      )
    }
    
    if (exam._count.attempts > 0 || exam._count.purchases > 0) {
      return NextResponse.json(
        { error: 'Cannot delete exam with existing attempts or purchases. Unpublish it instead.' },
        { status: 400 }
      )
    }
    
    await prisma.exam.delete({
      where: { id: params.id }
    })

    try {
      await cache.del(`exam:start-payload:${params.id}`)
    } catch (e) {
      console.warn('[Cache] Failed to invalidate exam cache on delete:', e)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Exam deleted successfully'
    })
    
  } catch (error) {
    return handleApiError(error)
  }
}