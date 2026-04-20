// src/app/api/admin/questions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ✅ NEW: match pairs schema shape for validation
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

  // ✅ EXISTING: MCQ fields — optional
  optionA: z.string().optional(),
  optionB: z.string().optional(),
  optionC: z.string().optional(),
  optionD: z.string().optional(),
  correctAnswer: z.enum(['A', 'B', 'C', 'D']).optional(),

  // ✅ UPDATED: added 'match' to questionType enum
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
  // ✅ EXISTING: MCQ must have options and correct answer — untouched
  (data) => {
    if (data.questionType === 'mcq') {
      return data.optionA && data.optionB && data.optionC && data.optionD && data.correctAnswer
    }
    return true
  },
  { message: 'MCQ questions require all 4 options and a correct answer', path: ['optionA'] }
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
  { message: 'Numerical questions require either an exact answer or a min/max range', path: ['correctAnswerExact'] }
).refine(
  // ✅ NEW: Match must have matchPairs + options A/B/C/D (combinations) + correctAnswer
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

// GET: List questions — untouched logic, just added 'match' to type filter support
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
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
          options: { orderBy: { sequence: 'asc' } }
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
        // ✅ NEW: include matchPairs in list response
        matchPairs: q.matchPairs ?? null,
        createdAt: q.createdAt,
      })),
      pagination: { total, totalPages: Math.ceil(total / limit), page }
    })
  } catch (error) {
    console.error('GET QUESTIONS ERROR:', error)
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
  }
}

// POST: Create a new question
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const data = questionSchema.parse(body)

    // ✅ EXISTING: Topic resolution — completely untouched
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

    // ✅ EXISTING: SubTopic resolution — completely untouched
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

        // ✅ EXISTING: NAT fields — only set for numerical, untouched logic
        correctAnswerExact: isNumerical ? (data.correctAnswerExact ?? null) : null,
        correctAnswerMin: isNumerical ? (data.correctAnswerMin ?? null) : null,
        correctAnswerMax: isNumerical ? (data.correctAnswerMax ?? null) : null,

        // ✅ NEW: matchPairs — only set for match type
        matchPairs: isMatch ? (data.matchPairs ?? null) : null,

        // ✅ Options created for both MCQ and Match (match uses combination options A/B/C/D)
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
        // ✅ NEW
        matchPairs: question.matchPairs ?? null,
      }
    }, { status: 201 })

  } catch (error) {
    console.error('CREATE QUESTION ERROR:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}