//src/app/api/practice-exams/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
export const dynamic = 'force-dynamic'

// Fisher-Yates shuffle — runs server-side so every page load is a fresh order
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const practiceExam = await prisma.practiceExam.findUnique({
      where: { slug: params.slug },
      include: {
        subject: { select: { id: true, name: true, slug: true } },
        questions: {
          orderBy: { order: 'asc' },
          include: {
            question: {
              include: {
                options: {
                  orderBy: { sequence: 'asc' },
                  select: {
                    id: true,
                    text: true,
                    optionKey: true,
                    isCorrect: true,   // needed for client-side answer check
                    imageUrl: true
                  }
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

    // Don't serve unpublished exams on public route
    if (practiceExam.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Practice exam not found' },
        { status: 404 }
      )
    }

    const questions = practiceExam.questions.map(pq => ({
      id: pq.question.id,
      statement: pq.question.statement,
      imageUrl: pq.question.imageUrl ?? null,
      explanation: pq.question.explanation ?? null,
      type: pq.question.type,
      options: pq.question.options
    }))

    // Shuffle server-side — fresh order on every request
    const shuffledQuestions = shuffleArray(questions)

    return NextResponse.json({
      practiceExam: {
        id: practiceExam.id,
        title: practiceExam.title,
        slug: practiceExam.slug,
        description: practiceExam.description ?? null,
        subject: practiceExam.subject,
        questionCount: practiceExam.questionCount,
        questions: shuffledQuestions
      }
    })

  } catch (error) {
    console.error('GET /api/practice-exams/[slug] error:', error)
    return handleApiError(error)
  }
}