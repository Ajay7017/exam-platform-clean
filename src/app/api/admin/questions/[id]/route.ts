// src/app/api/admin/questions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ✅ UPDATED: schema now handles both MCQ and NAT
const questionUpdateSchema = z.object({
  statement: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  marks: z.number(),
  negativeMarks: z.number(),
  explanation: z.string().optional(),
  isActive: z.boolean().optional(),
  topicId: z.string().optional(),
  subjectId: z.string().optional(),
  topicName: z.string().optional(),
  subTopicId: z.string().optional(),
  subTopicName: z.string().optional(),

  // ✅ EXISTING: MCQ fields — now optional
  optionA: z.string().optional(),
  optionB: z.string().optional(),
  optionC: z.string().optional(),
  optionD: z.string().optional(),
  correctAnswer: z.enum(['A', 'B', 'C', 'D']).optional(),

  // ✅ NEW: NAT fields
  questionType: z.enum(['mcq', 'numerical']).default('mcq'),
  correctAnswerExact: z.number().optional().nullable(),
  correctAnswerMin: z.number().optional().nullable(),
  correctAnswerMax: z.number().optional().nullable(),

}).refine(
  (data) => data.topicId || (data.subjectId && data.topicName),
  { message: 'Either topicId or (subjectId + topicName) must be provided', path: ['topicId'] }
).refine(
  (data) => {
    if (data.questionType === 'mcq') {
      return data.optionA && data.optionB && data.optionC && data.optionD && data.correctAnswer
    }
    return true
  },
  { message: 'MCQ questions require all 4 options and correct answer', path: ['optionA'] }
).refine(
  (data) => {
    if (data.questionType === 'numerical') {
      const hasExact = data.correctAnswerExact !== null && data.correctAnswerExact !== undefined
      const hasRange = data.correctAnswerMin !== null && data.correctAnswerMin !== undefined
                    && data.correctAnswerMax !== null && data.correctAnswerMax !== undefined
      return hasExact || hasRange
    }
    return true
  },
  { message: 'Numerical questions require exact answer or min/max range', path: ['correctAnswerExact'] }
)

// GET: Fetch single question
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const question = await prisma.question.findUnique({
      where: { id: params.id },
      include: {
        options: { orderBy: { sequence: 'asc' } },
        topic: { include: { subject: true } },
        subTopic: true,
      }
    })

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const formattedQuestion = {
      id: question.id,
      statement: question.statement,
      subjectId: question.topic.subjectId,
      subjectName: question.topic.subject.name,
      topicId: question.topicId,
      topic: question.topic.name,
      subTopicId: question.subTopicId || '',
      subTopic: question.subTopic?.name || '',
      difficulty: question.difficulty,
      marks: question.marks,
      negativeMarks: question.negativeMarks,
      explanation: question.explanation || '',
      isActive: question.isActive,

      // ✅ EXISTING: MCQ options
      optionA: question.options.find(o => o.optionKey === 'A')?.text || '',
      optionB: question.options.find(o => o.optionKey === 'B')?.text || '',
      optionC: question.options.find(o => o.optionKey === 'C')?.text || '',
      optionD: question.options.find(o => o.optionKey === 'D')?.text || '',
      correctAnswer: question.options.find(o => o.isCorrect)?.optionKey || 'A',

      // ✅ NEW: NAT fields
      questionType: question.type ?? 'mcq',
      correctAnswerExact: question.correctAnswerExact,
      correctAnswerMin: question.correctAnswerMin,
      correctAnswerMax: question.correctAnswerMax,

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

    let parsed
    try {
      parsed = questionUpdateSchema.parse(body)
    } catch (zodError) {
      if (zodError instanceof z.ZodError) {
        console.error('Validation error:', zodError.errors)
        return NextResponse.json(
          { error: 'Validation failed', details: zodError.errors },
          { status: 400 }
        )
      }
      throw zodError
    }

    const data = parsed

    const existingQuestion = await prisma.question.findUnique({
      where: { id: params.id },
      include: { options: true }
    })

    if (!existingQuestion) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    let topicId: string

    if (data.topicId) {
      const topicExists = await prisma.topic.findUnique({ where: { id: data.topicId } })
      if (!topicExists) {
        return NextResponse.json({ error: 'Topic not found' }, { status: 400 })
      }
      topicId = data.topicId
    } else {
      const subject = await prisma.subject.findUnique({ where: { id: data.subjectId! } })
      if (!subject) {
        return NextResponse.json({ error: 'Subject not found' }, { status: 400 })
      }

      let topic = await prisma.topic.findFirst({
        where: {
          subjectId: data.subjectId!,
          name: { equals: data.topicName!.trim(), mode: 'insensitive' }
        }
      })

      if (!topic) {
        const slug = data.topicName!.toLowerCase().trim()
          .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        topic = await prisma.topic.create({
          data: {
            name: data.topicName!.trim(),
            slug: `${slug}-${Date.now().toString().slice(-6)}`,
            subjectId: data.subjectId!,
            isActive: true,
            sequence: 0,
          }
        })
      }

      topicId = topic.id
    }

    let subTopicId: string | null = null

    if (data.subTopicId) {
      const subTopicExists = await prisma.subTopic.findUnique({ where: { id: data.subTopicId } })
      if (!subTopicExists) {
        return NextResponse.json({ error: 'SubTopic not found' }, { status: 400 })
      }
      subTopicId = data.subTopicId
    } else if (data.subTopicName) {
      let subTopic = await prisma.subTopic.findFirst({
        where: {
          topicId,
          name: { equals: data.subTopicName.trim(), mode: 'insensitive' }
        }
      })

      if (!subTopic) {
        const slug = data.subTopicName.toLowerCase().trim()
          .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        subTopic = await prisma.subTopic.create({
          data: {
            name: data.subTopicName.trim(),
            slug: `${slug}-${Date.now().toString().slice(-6)}`,
            topicId,
            isActive: true,
            sequence: 0,
          }
        })
      }

      subTopicId = subTopic.id
    }

    const isNumerical = data.questionType === 'numerical'

    const updatedQuestion = await prisma.$transaction(async (tx) => {
      const question = await tx.question.update({
        where: { id: params.id },
        data: {
          statement: data.statement,
          topicId,
          subTopicId,
          marks: data.marks,
          negativeMarks: data.negativeMarks,
          difficulty: data.difficulty,
          explanation: data.explanation || '',
          isActive: data.isActive ?? true,
          type: data.questionType ?? 'mcq',
          correctAnswerExact: isNumerical ? (data.correctAnswerExact ?? null) : null,
          correctAnswerMin: isNumerical ? (data.correctAnswerMin ?? null) : null,
          correctAnswerMax: isNumerical ? (data.correctAnswerMax ?? null) : null,
        }
      })

      if (!isNumerical) {
        const optionUpdates = [
          { key: 'A', text: data.optionA!, isCorrect: data.correctAnswer === 'A' },
          { key: 'B', text: data.optionB!, isCorrect: data.correctAnswer === 'B' },
          { key: 'C', text: data.optionC!, isCorrect: data.correctAnswer === 'C' },
          { key: 'D', text: data.optionD!, isCorrect: data.correctAnswer === 'D' },
        ]

        for (const opt of optionUpdates) {
          const existing = existingQuestion.options.find(o => o.optionKey === opt.key)
          if (existing) {
            await tx.option.update({
              where: { id: existing.id },
              data: { text: opt.text, isCorrect: opt.isCorrect }
            })
          }
        }
      }

      return question
    })

    // Bust cache for all exams that contain this question
    // so students get the updated question text/options immediately
    try {
      const affectedExams = await prisma.examQuestion.findMany({
        where: { questionId: params.id },
        select: { examId: true }
      })
      await Promise.all(
        affectedExams.map(eq => cache.del(`exam:start-payload:${eq.examId}`))
      )
    } catch (e) {
      console.warn('[Cache] Failed to invalidate exam caches for question update:', e)
    }

    return NextResponse.json({
      success: true,
      questionId: updatedQuestion.id,
      message: 'Question updated successfully'
    })

  } catch (error) {
    console.error('UPDATE QUESTION ERROR:', error)
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 })
  }
}

// PATCH: Inline status toggle
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    const body = await request.json()
    const { isActive } = z.object({ isActive: z.boolean() }).parse(body)

    const question = await prisma.question.findUnique({ where: { id: params.id } })
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    await prisma.question.update({ where: { id: params.id }, data: { isActive } })

    return NextResponse.json({ success: true, isActive })
  } catch (error) {
    console.error('PATCH QUESTION ERROR:', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}

// ✅ EXISTING: DELETE — completely untouched
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const question = await prisma.question.findUnique({
      where: { id: params.id },
      include: { _count: { select: { examQuestions: true } } }
    })

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    if (question._count.examQuestions > 0) {
      return NextResponse.json(
        { error: 'Cannot delete question that is used in exams', usedInExams: question._count.examQuestions },
        { status: 400 }
      )
    }

    await prisma.question.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true, message: 'Question deleted successfully' })

  } catch (error) {
    console.error('DELETE QUESTION ERROR:', error)
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 })
  }
}