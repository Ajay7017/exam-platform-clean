// src/app/api/admin/questions/export/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const exportSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(500),
})

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const { ids } = exportSchema.parse(body)

    const questions = await prisma.question.findMany({
      where: { id: { in: ids } },
      include: {
        topic: { include: { subject: true } },
        subTopic: true,
        options: { orderBy: { sequence: 'asc' } },
      },
      // Preserve the order the admin selected them (by createdAt as fallback)
      orderBy: { createdAt: 'asc' },
    })

    // Re-order to match the requested `ids` order (admin's selection order)
    const idIndexMap = new Map(ids.map((id, i) => [id, i]))
    questions.sort((a, b) => (idIndexMap.get(a.id) ?? 0) - (idIndexMap.get(b.id) ?? 0))

    return NextResponse.json({
      questions: questions.map((q) => {
        // Find the correct option key
        const correctOption = q.options.find((o) => o.isCorrect)

        return {
          id: q.id,
          statement: q.statement,
          questionType: q.type,               // 'mcq' | 'numerical' | 'match'
          subjectName: q.topic.subject.name,
          topicName: q.topic.name,
          subTopicName: q.subTopic?.name ?? null,
          difficulty: q.difficulty,
          marks: q.marks,
          negativeMarks: q.negativeMarks,

          // MCQ / Match combination options (A, B, C, D)
          options: q.options.map((o) => ({
            key: o.optionKey,   // 'A' | 'B' | 'C' | 'D'
            text: o.text,
            isCorrect: o.isCorrect,
          })),

          // Correct answer key ('A' | 'B' | 'C' | 'D' | null for numerical)
          correctAnswer: correctOption?.optionKey ?? null,

          // Numerical answer fields
          correctAnswerExact: q.correctAnswerExact,
          correctAnswerMin: q.correctAnswerMin,
          correctAnswerMax: q.correctAnswerMax,

          // Match question column data
          matchPairs: (q.matchPairs as any) ?? null,

          // Explanation (optional)
          explanation: q.explanation ?? null,
        }
      }),
    })
  } catch (error) {
    console.error('EXPORT QUESTIONS ERROR:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch questions for export' },
      { status: 500 }
    )
  }
}