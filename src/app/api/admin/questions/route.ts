// src/app/api/admin/questions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Updated validation schema to support both existing and new topics
const questionSchema = z.object({
  statement: z.string().min(1),
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
  // New fields for dynamic topic handling
  topicId: z.string().optional(),
  subjectId: z.string().optional(),
  topicName: z.string().optional(),
}).refine(
  (data) => data.topicId || (data.subjectId && data.topicName),
  {
    message: "Either topicId or (subjectId + topicName) must be provided",
    path: ["topicId"],
  }
)

// GET: List questions
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')
    const search = searchParams.get('search') || ''
    const difficulty = searchParams.get('difficulty')

    const where: any = {}
    if (search) where.statement = { contains: search, mode: 'insensitive' }
    if (difficulty && difficulty !== 'all') where.difficulty = difficulty

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        include: {
          topic: { include: { subject: true } },
          options: {
            orderBy: { sequence: 'asc' }
          }
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
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        difficulty: q.difficulty,
        isActive: q.isActive,
        explanation: q.explanation,
        options: q.options,
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

    let topicId: string

    // Case 1: Using existing topic
    if (data.topicId) {
      // Verify topic exists
      const topicExists = await prisma.topic.findUnique({
        where: { id: data.topicId }
      })

      if (!topicExists) {
        return NextResponse.json(
          { error: 'Selected topic not found' },
          { status: 404 }
        )
      }

      topicId = data.topicId
    }
    // Case 2: Creating new topic
    else if (data.subjectId && data.topicName) {
      // Verify subject exists
      const subject = await prisma.subject.findUnique({
        where: { id: data.subjectId }
      })

      if (!subject) {
        return NextResponse.json(
          { error: 'Subject not found' },
          { status: 404 }
        )
      }

      // Check if topic already exists in this subject
      let existingTopic = await prisma.topic.findFirst({
        where: {
          subjectId: data.subjectId,
          name: { equals: data.topicName.trim(), mode: 'insensitive' }
        }
      })

      if (existingTopic) {
        // Topic already exists, use it
        topicId = existingTopic.id
      } else {
        // Create new topic
        const slug = data.topicName
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')

        // Ensure unique slug
        const uniqueSlug = `${slug}-${Date.now().toString().slice(-6)}`

        const newTopic = await prisma.topic.create({
          data: {
            name: data.topicName.trim(),
            slug: uniqueSlug,
            subjectId: data.subjectId,
            isActive: true,
            sequence: 0
          }
        })

        topicId = newTopic.id
      }
    } else {
      return NextResponse.json(
        { error: 'Either topicId or (subjectId + topicName) must be provided' },
        { status: 400 }
      )
    }

    // Create Question with Options
    const question = await prisma.question.create({
      data: {
        statement: data.statement,
        topicId: topicId,
        marks: data.marks,
        negativeMarks: data.negativeMarks,
        difficulty: data.difficulty,
        explanation: data.explanation || '',
        isActive: data.isActive ?? true,
        options: {
          create: [
            { 
              text: data.optionA, 
              optionKey: 'A', 
              sequence: 1, 
              isCorrect: data.correctAnswer === 'A' 
            },
            { 
              text: data.optionB, 
              optionKey: 'B', 
              sequence: 2, 
              isCorrect: data.correctAnswer === 'B' 
            },
            { 
              text: data.optionC, 
              optionKey: 'C', 
              sequence: 3, 
              isCorrect: data.correctAnswer === 'C' 
            },
            { 
              text: data.optionD, 
              optionKey: 'D', 
              sequence: 4, 
              isCorrect: data.correctAnswer === 'D' 
            },
          ]
        }
      },
      include: {
        topic: {
          include: {
            subject: true
          }
        },
        options: true
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
        marks: question.marks,
        negativeMarks: question.negativeMarks,
        difficulty: question.difficulty,
        isActive: question.isActive,
        explanation: question.explanation,
      }
    }, { status: 201 })

  } catch (error) {
    console.error('CREATE QUESTION ERROR:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 })
    }
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}