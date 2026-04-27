// src/app/api/admin/questions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { computeQuestionHash } from '@/lib/question-parser'

// ── Match pairs schema — untouched ────────────────────────────────────────────
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

// ── Question schema — untouched ───────────────────────────────────────────────
const questionSchema = z.object({
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

  optionA: z.string().optional(),
  optionB: z.string().optional(),
  optionC: z.string().optional(),
  optionD: z.string().optional(),
  correctAnswer: z.enum(['A', 'B', 'C', 'D']).optional(),

  questionType: z.enum(['mcq', 'numerical', 'match']).default('mcq'),

  correctAnswerExact: z.number().optional().nullable(),
  correctAnswerMin: z.number().optional().nullable(),
  correctAnswerMax: z.number().optional().nullable(),

  matchPairs: matchPairsSchema.optional().nullable(),

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
  { message: 'MCQ questions require all 4 options and a correct answer', path: ['optionA'] }
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
  { message: 'Numerical questions require either an exact answer or a min/max range', path: ['correctAnswerExact'] }
).refine(
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

// ── GET: List questions ───────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)

    // ✅ Duplicate check endpoint — untouched
    const checkDuplicate = searchParams.get('checkDuplicate')
    if (checkDuplicate === 'true') {
      const hash = searchParams.get('hash')
      if (!hash) {
        return NextResponse.json({ isDuplicate: false, existing: null })
      }

      const existing = await prisma.question.findFirst({
        where: {
          contentHash: hash,
          isActive: true,
        },
        select: {
          id: true,
          statement: true,
          topic: {
            select: {
              name: true,
              subject: { select: { name: true } }
            }
          }
        }
      })

      if (!existing) {
        return NextResponse.json({ isDuplicate: false, existing: null })
      }

      return NextResponse.json({
        isDuplicate: true,
        existing: {
          id: existing.id,
          statement: existing.statement.length > 200
            ? existing.statement.slice(0, 200) + '...'
            : existing.statement,
          topicName: existing.topic.name,
          subjectName: existing.topic.subject.name,
        }
      })
    }

    // ── Existing list logic ───────────────────────────────────────────────────
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')
    const search = searchParams.get('search') || ''
    const difficulty = searchParams.get('difficulty')
    const subjectId = searchParams.get('subjectId')
    const topicId = searchParams.get('topicId')
    const subTopicId = searchParams.get('subTopicId')
    const questionType = searchParams.get('questionType')

    const where: any = {}
    if (search) where.statement = { contains: search, mode: 'insensitive' }
    if (difficulty && difficulty !== 'all') where.difficulty = difficulty
    if (topicId) where.topicId = topicId
    if (subTopicId) where.subTopicId = subTopicId
    if (subjectId) where.topic = { subjectId }
    if (questionType && questionType !== 'all') where.type = questionType

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        include: {
          topic: { include: { subject: true } },
          subTopic: true,
          options: { orderBy: { sequence: 'asc' } },
          // ✅ NEW: batch-load exam usage for all questions in one join
          // select only what we need — no extra data transferred
          examQuestions: {
            select: {
              exam: {
                select: { id: true, title: true }
              }
            }
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.question.count({ where })
    ])

    return NextResponse.json({
      questions: questions.map(q => ({
        id: q.id,
        statement: q.statement,
        topicId: q.topicId,
        topicName: q.topic.name,
        subjectId: q.topic.subjectId,
        subjectName: q.topic.subject.name,
        subTopicId: q.subTopicId,
        subTopicName: q.subTopic?.name,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        difficulty: q.difficulty,
        isActive: q.isActive,
        explanation: q.explanation,
        options: q.options,
        questionType: q.type,
        correctAnswerExact: q.correctAnswerExact,
        correctAnswerMin: q.correctAnswerMin,
        correctAnswerMax: q.correctAnswerMax,
        matchPairs: q.matchPairs ?? null,
        createdAt: q.createdAt,
        // ✅ NEW: exam usage — array of { id, title } for each exam using this question
        usedInExams: q.examQuestions.map(eq => eq.exam),
      })),
      pagination: { total, totalPages: Math.ceil(total / limit), page }
    })
  } catch (error) {
    console.error('GET QUESTIONS ERROR:', error)
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
  }
}

// ── POST: Create a new question — untouched ───────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const data = questionSchema.parse(body)

    // ── Topic resolution — untouched ──────────────────────────────────────────
    let topicId: string

    if (data.topicId) {
      const topicExists = await prisma.topic.findUnique({ where: { id: data.topicId } })
      if (!topicExists) {
        return NextResponse.json({ error: 'Selected topic not found' }, { status: 404 })
      }
      topicId = data.topicId
    } else if (data.subjectId && data.topicName) {
      const subject = await prisma.subject.findUnique({ where: { id: data.subjectId } })
      if (!subject) {
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
      }

      let existingTopic = await prisma.topic.findFirst({
        where: { subjectId: data.subjectId, name: { equals: data.topicName.trim(), mode: 'insensitive' } }
      })

      if (existingTopic) {
        topicId = existingTopic.id
      } else {
        const slug = data.topicName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        const newTopic = await prisma.topic.create({
          data: {
            name: data.topicName.trim(),
            slug: `${slug}-${Date.now().toString().slice(-6)}`,
            subjectId: data.subjectId,
            isActive: true,
            sequence: 0,
          }
        })
        topicId = newTopic.id
      }
    } else {
      return NextResponse.json({ error: 'Either topicId or (subjectId + topicName) must be provided' }, { status: 400 })
    }

    // ── SubTopic resolution — untouched ───────────────────────────────────────
    let subTopicId: string | undefined

    if (data.subTopicId) {
      const subTopicExists = await prisma.subTopic.findUnique({ where: { id: data.subTopicId } })
      if (!subTopicExists) {
        return NextResponse.json({ error: 'Selected subtopic not found' }, { status: 404 })
      }
      subTopicId = data.subTopicId
    } else if (data.subTopicName) {
      let existingSubTopic = await prisma.subTopic.findFirst({
        where: { topicId, name: { equals: data.subTopicName.trim(), mode: 'insensitive' } }
      })

      if (existingSubTopic) {
        subTopicId = existingSubTopic.id
      } else {
        const slug = data.subTopicName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        const newSubTopic = await prisma.subTopic.create({
          data: {
            name: data.subTopicName.trim(),
            slug: `${slug}-${Date.now().toString().slice(-6)}`,
            topicId,
            isActive: true,
            sequence: 0,
          }
        })
        subTopicId = newSubTopic.id
      }
    }

    // ✅ Compute hash — untouched
    const contentHash = computeQuestionHash({
      questionType: data.questionType,
      statement: data.statement,
      optionA: data.optionA,
      optionB: data.optionB,
      optionC: data.optionC,
      optionD: data.optionD,
      correctAnswerExact: data.correctAnswerExact,
      correctAnswerMin: data.correctAnswerMin,
      correctAnswerMax: data.correctAnswerMax,
      matchPairs: data.matchPairs,
    })

    // ✅ Duplicate check at save time — untouched
    if (contentHash) {
      const existing = await prisma.question.findFirst({
        where: { contentHash, isActive: true },
        select: {
          id: true,
          statement: true,
          topic: {
            select: {
              name: true,
              subject: { select: { name: true } }
            }
          }
        }
      })

      if (existing) {
        return NextResponse.json({
          error: 'Duplicate question detected',
          isDuplicate: true,
          existing: {
            id: existing.id,
            statement: existing.statement.length > 200
              ? existing.statement.slice(0, 200) + '...'
              : existing.statement,
            topicName: existing.topic.name,
            subjectName: existing.topic.subject.name,
          }
        }, { status: 409 })
      }
    }

    const isNumerical = data.questionType === 'numerical'
    const isMatch = data.questionType === 'match'

    const question = await prisma.question.create({
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
        contentHash: contentHash ?? null,
        correctAnswerExact: isNumerical ? (data.correctAnswerExact ?? null) : null,
        correctAnswerMin: isNumerical ? (data.correctAnswerMin ?? null) : null,
        correctAnswerMax: isNumerical ? (data.correctAnswerMax ?? null) : null,
        matchPairs: isMatch ? (data.matchPairs as any ?? null) : null,

        ...((isNumerical === false) && {
          options: {
            create: [
              { text: data.optionA!, optionKey: 'A', sequence: 1, isCorrect: data.correctAnswer === 'A' },
              { text: data.optionB!, optionKey: 'B', sequence: 2, isCorrect: data.correctAnswer === 'B' },
              { text: data.optionC!, optionKey: 'C', sequence: 3, isCorrect: data.correctAnswer === 'C' },
              { text: data.optionD!, optionKey: 'D', sequence: 4, isCorrect: data.correctAnswer === 'D' },
            ]
          }
        })
      },
      include: {
        topic: { include: { subject: true } },
        subTopic: true,
        options: true,
      }
    })

    return NextResponse.json({
      success: true,
      questionId: question.id,
      question: {
        id: question.id,
        statement: question.statement,
        topicId: question.topicId,
        topicName: question.topic.name,
        subjectId: question.topic.subjectId,
        subjectName: question.topic.subject.name,
        subTopicId: question.subTopicId,
        subTopicName: question.subTopic?.name,
        marks: question.marks,
        negativeMarks: question.negativeMarks,
        difficulty: question.difficulty,
        isActive: question.isActive,
        explanation: question.explanation,
        questionType: question.type,
        correctAnswerExact: question.correctAnswerExact,
        correctAnswerMin: question.correctAnswerMin,
        correctAnswerMax: question.correctAnswerMax,
        matchPairs: question.matchPairs ?? null,
      }
    }, { status: 201 })

  } catch (error) {
    console.error('CREATE QUESTION ERROR:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}