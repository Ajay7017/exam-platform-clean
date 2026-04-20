// src/app/api/admin/questions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { cache } from '@/lib/redis'

// ✅ NEW: match pairs schema — same shape as in route.ts
const matchPairsSchema = z.object({
  leftColumn: z.object({
    header: z.string().min(1),
    items: z.array(z.string().min(1)).min(2).max(6),
  }),
  rightColumn: z.object({
    header: z.string().min(1),
    items: z.array(z.string().min(1)).min(2).max(6),
  }),
}).refine(
  (data) => data.leftColumn.items.length === data.rightColumn.items.length,
  { message: 'Left and right column must have equal number of items' }
)

// ✅ UPDATED: schema now handles MCQ, NAT, and Match
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

  // ✅ EXISTING: MCQ fields — optional
  optionA: z.string().optional(),
  optionB: z.string().optional(),
  optionC: z.string().optional(),
  optionD: z.string().optional(),
  correctAnswer: z.enum(['A', 'B', 'C', 'D']).optional(),

  // ✅ UPDATED: added 'match' to enum
  questionType: z.enum(['mcq', 'numerical', 'match']).default('mcq'),

  // ✅ EXISTING: NAT fields — untouched
  correctAnswerExact: z.number().optional().nullable(),
  correctAnswerMin: z.number().optional().nullable(),
  correctAnswerMax: z.number().optional().nullable(),

  // ✅ NEW: match fields
  matchPairs: matchPairsSchema.optional().nullable(),

}).refine(
  (data) => data.topicId || (data.subjectId && data.topicName),
  { message: 'Either topicId or (subjectId + topicName) must be provided', path: ['topicId'] }
).refine(
  // ✅ EXISTING: MCQ validation — untouched
  (data) => {
    if (data.questionType === 'mcq') {
      return data.optionA && data.optionB && data.optionC && data.optionD && data.correctAnswer
    }
    return true
  },
  { message: 'MCQ questions require all 4 options and correct answer', path: ['optionA'] }
).refine(
  // ✅ EXISTING: NAT validation — untouched
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
).refine(
  // ✅ NEW: Match validation
  (data) => {
    if (data.questionType === 'match') {
      return (
        data.matchPairs !== null &&
        data.matchPairs !== undefined &&
        data.optionA && data.optionB && data.optionC && data.optionD &&
        data.correctAnswer
      )
    }
    return true
  },
  { message: 'Match questions require matchPairs, all 4 combination options, and a correct answer', path: ['matchPairs'] }
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

      // ✅ EXISTING: MCQ options — untouched
      optionA: question.options.find(o => o.optionKey === 'A')?.text || '',
      optionB: question.options.find(o => o.optionKey === 'B')?.text || '',
      optionC: question.options.find(o => o.optionKey === 'C')?.text || '',
      optionD: question.options.find(o => o.optionKey === 'D')?.text || '',
      correctAnswer: question.options.find(o => o.isCorrect)?.optionKey || 'A',

      // ✅ EXISTING: NAT fields — untouched
      questionType: question.type ?? 'mcq',
      correctAnswerExact: question.correctAnswerExact,
      correctAnswerMin: question.correctAnswerMin,
      correctAnswerMax: question.correctAnswerMax,

      // ✅ NEW: match field
      matchPairs: question.matchPairs ?? null,

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

    // ✅ EXISTING: Topic resolution — completely untouched
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

    // ✅ EXISTING: SubTopic resolution — completely untouched
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
    const isMatch = data.questionType === 'match'

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

          // ✅ EXISTING: NAT fields — untouched logic
          correctAnswerExact: isNumerical ? (data.correctAnswerExact ?? null) : null,
          correctAnswerMin: isNumerical ? (data.correctAnswerMin ?? null) : null,
          correctAnswerMax: isNumerical ? (data.correctAnswerMax ?? null) : null,

          // ✅ NEW: matchPairs — only set for match, cleared otherwise
          matchPairs: isMatch ? (data.matchPairs ?? null) : null,
        }
      })

      // ✅ Update options for both MCQ and Match (both use A/B/C/D options)
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
          } else {
            // ✅ Edge case: question type changed from numerical → match/mcq, options don't exist yet
            await tx.option.create({
              data: {
                questionId: params.id,
                text: opt.text,
                optionKey: opt.key,
                sequence: ['A', 'B', 'C', 'D'].indexOf(opt.key) + 1,
                isCorrect: opt.isCorrect,
              }
            })
          }
        }
      } else {
        // ✅ Edge case: switched TO numerical — delete any existing options
        if (existingQuestion.options.length > 0) {
          await tx.option.deleteMany({ where: { questionId: params.id } })
        }
      }

      return question
    })

    // ✅ EXISTING: Cache busting — completely untouched
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

// ✅ EXISTING: PATCH — completely untouched
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