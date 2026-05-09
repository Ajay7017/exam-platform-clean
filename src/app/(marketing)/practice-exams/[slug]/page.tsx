// src/app/(marketing)/practice-exams/[slug]/page.tsx
// force-dynamic — no cache — every visit gets a fresh server-side shuffle
// Server component shell fetches data; client component handles interactivity

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PracticeExamClient } from '@/app/(marketing)/practice-exams/[slug]/PracticeExamClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { slug: string }
}

// ── Data fetching (server) ────────────────────────────────────────────────
// Replicates the shuffle logic from the API route — keeps the server component
// self-contained and avoids an extra HTTP round-trip.
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

async function getPracticeExam(slug: string) {
  try {
    const practiceExam = await prisma.practiceExam.findUnique({
      where: { slug },
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
                    isCorrect: true,
                    imageUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!practiceExam || practiceExam.status !== 'PUBLISHED') return null

    const questions = practiceExam.questions.map(pq => ({
      id: pq.question.id,
      statement: pq.question.statement,
      imageUrl: pq.question.imageUrl ?? null,
      explanation: pq.question.explanation ?? null,
      type: pq.question.type,
      options: pq.question.options,
    }))

    return {
      id: practiceExam.id,
      title: practiceExam.title,
      slug: practiceExam.slug,
      description: practiceExam.description ?? null,
      subject: practiceExam.subject,
      questionCount: practiceExam.questionCount,
      questions: shuffleArray(questions),
    }
  } catch {
    return null
  }
}

// ── Metadata ─────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const exam = await getPracticeExam(params.slug)
  if (!exam) return { title: 'Practice Exam Not Found — Mockzy' }
  return {
    title: `${exam.title} — Free Practice Questions | Mockzy`,
    description:
      exam.description ??
      `Practice ${exam.questionCount} questions on ${exam.subject.name}. Free, no login. Instant answer reveal.`,
  }
}

// ── Page ─────────────────────────────────────────────────────────────────
export default async function PracticeExamPage({ params }: PageProps) {
  const exam = await getPracticeExam(params.slug)

  if (!exam) notFound()

  return <PracticeExamClient exam={exam} />
}