// src/app/api/admin/questions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const questionUpdateSchema = z.object({
  statement: z.string().min(1),
  subject: z.string().min(1),
  topic: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  marks: z.number(),
  negativeMarks: z.number(),
  optionA: z.string().min(1),
  optionB: z.string().min(1),
  optionC: z.string().min(1),
  optionD: z.string().min(1),
  correctAnswer: z.enum(['A', 'B', 'C', 'D']),
  explanation: z.string().optional(),
  isActive: z.boolean().optional(),
})

// GET: Fetch single question by ID with all details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    
    const question = await prisma.question.findUnique({
      where: { id: params.id },
      include: {
        options: {
          orderBy: { sequence: 'asc' }
        },
        topic: {
          include: { subject: true }
        }
      }
    })

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Format response to match form structure
    const formattedQuestion = {
      id: question.id,
      statement: question.statement,
      subject: question.topic.subject.name,
      topic: question.topic.name,
      difficulty: question.difficulty,
      marks: question.marks,
      negativeMarks: question.negativeMarks,
      explanation: question.explanation || '',
      isActive: question.isActive,
      optionA: question.options.find(o => o.optionKey === 'A')?.text || '',
      optionB: question.options.find(o => o.optionKey === 'B')?.text || '',
      optionC: question.options.find(o => o.optionKey === 'C')?.text || '',
      optionD: question.options.find(o => o.optionKey === 'D')?.text || '',
      correctAnswer: question.options.find(o => o.isCorrect)?.optionKey || 'A',
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    }

    return NextResponse.json({ question: formattedQuestion })
  } catch (error) {
    console.error('GET QUESTION ERROR:', error)
    return NextResponse.json({ error: 'Failed to fetch question' }, { status: 500 })
  }
}

// PUT: Update question
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    const body = await request.json()
    const data = questionUpdateSchema.parse(body)

    // Check if question exists
    const existingQuestion = await prisma.question.findUnique({
      where: { id: params.id },
      include: { options: true }
    })

    if (!existingQuestion) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Find Subject
    const subject = await prisma.subject.findFirst({
      where: { name: { equals: data.subject, mode: 'insensitive' } }
    })

    if (!subject) {
      return NextResponse.json(
        { error: `Subject '${data.subject}' not found` },
        { status: 400 }
      )
    }

    // Find or Create Topic
    let topic = await prisma.topic.findFirst({
      where: { 
        subjectId: subject.id,
        name: { equals: data.topic, mode: 'insensitive' }
      }
    })

    if (!topic) {
      const slug = data.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      topic = await prisma.topic.create({
        data: {
          name: data.topic,
          slug: `${slug}-${Date.now().toString().slice(-4)}`,
          subjectId: subject.id,
          isActive: true
        }
      })
    }

    // Update question and options in a transaction
    const updatedQuestion = await prisma.$transaction(async (tx) => {
      // Update question
      const question = await tx.question.update({
        where: { id: params.id },
        data: {
          statement: data.statement,
          topicId: topic.id,
          marks: data.marks,
          negativeMarks: data.negativeMarks,
          difficulty: data.difficulty,
          explanation: data.explanation || '',
          isActive: data.isActive ?? true,
        }
      })

      // Update options
      const optionUpdates = [
        { key: 'A', text: data.optionA, isCorrect: data.correctAnswer === 'A' },
        { key: 'B', text: data.optionB, isCorrect: data.correctAnswer === 'B' },
        { key: 'C', text: data.optionC, isCorrect: data.correctAnswer === 'C' },
        { key: 'D', text: data.optionD, isCorrect: data.correctAnswer === 'D' },
      ]

      for (const opt of optionUpdates) {
        const existingOption = existingQuestion.options.find(o => o.optionKey === opt.key)
        
        if (existingOption) {
          await tx.option.update({
            where: { id: existingOption.id },
            data: { text: opt.text, isCorrect: opt.isCorrect }
          })
        }
      }

      return question
    })

    return NextResponse.json({ 
      success: true, 
      questionId: updatedQuestion.id,
      message: 'Question updated successfully'
    })

  } catch (error) {
    console.error('UPDATE QUESTION ERROR:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 })
  }
}

// DELETE: Delete question
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    // Check if question exists
    const question = await prisma.question.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            examQuestions: true
          }
        }
      }
    })

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Check if question is used in any exams
    if (question._count.examQuestions > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete question that is used in exams',
          usedInExams: question._count.examQuestions 
        },
        { status: 400 }
      )
    }

    // Delete question (options will be cascade deleted)
    await prisma.question.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Question deleted successfully' 
    })

  } catch (error) {
    console.error('DELETE QUESTION ERROR:', error)
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 })
  }
}