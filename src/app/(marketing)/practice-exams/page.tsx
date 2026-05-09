// src/app/(marketing)/practice-exams/page.tsx
// Server component — direct Prisma fetch, revalidate every 60s
// Subject filter is URL-based (?subject=<id>) — SEO-friendly, no hydration overhead

import { Suspense } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { BookOpen, FileText, Loader2 } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { PracticeExamCard } from '@/components/student/PracticeExamCard'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Free Practice Questions — Mockzy',
  description:
    'Practice questions for JEE, NEET and more. Free, no login required. Instant answer reveal with explanations.',
}

interface PageProps {
  searchParams: { subject?: string }
}

interface Subject {
  id: string
  name: string
  slug: string
}

interface PracticeExam {
  id: string
  title: string
  slug: string
  description: string | null
  questionCount: number
  subject: Subject
}

// Only fetch subjects that have at least 1 PUBLISHED exam
async function getSubjectsWithExams(): Promise<Subject[]> {
  try {
    const subjects = await prisma.subject.findMany({
      where: {
        practiceExams: {
          some: { status: 'PUBLISHED' },
        },
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    })
    return subjects
  } catch {
    return []
  }
}

async function getPracticeExams(subjectId?: string): Promise<PracticeExam[]> {
  try {
    const exams = await prisma.practiceExam.findMany({
      where: {
        status: 'PUBLISHED',
        ...(subjectId ? { subjectId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        questionCount: true,
        subject: { select: { id: true, name: true, slug: true } },
      },
    })
    return exams
  } catch {
    return []
  }
}

export default async function PracticeExamsPage({ searchParams }: PageProps) {
  const activeSubjectId = searchParams.subject ?? null

  // Fetch both in parallel
  const [subjects, exams] = await Promise.all([
    getSubjectsWithExams(),
    getPracticeExams(activeSubjectId ?? undefined),
  ])

  const activeSubject = subjects.find(s => s.id === activeSubjectId) ?? null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-16">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 pt-10 pb-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            Free{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-500">
              Practice Questions
            </span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-sm md:text-base">
            No login required. Click an answer and get instant feedback with detailed explanations.
          </p>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Subject filter tabs */}
        {subjects.length > 0 && (
          <div className="flex flex-wrap gap-2.5 mb-10">
            {/* "All" tab */}
            <Link
              href="/practice-exams"
              className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                !activeSubjectId
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-105'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              All Subjects
            </Link>

            {subjects.map(subject => (
              <Link
                key={subject.id}
                href={`/practice-exams?subject=${subject.id}`}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeSubjectId === subject.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-105'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                {subject.name}
              </Link>
            ))}
          </div>
        )}

        {/* Active filter label */}
        {activeSubject && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Showing practice exams for{' '}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {activeSubject.name}
            </span>
          </p>
        )}

        {/* ── Exam grid ──────────────────────────────────────────────── */}
        {exams.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <FileText className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              No practice exams yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activeSubject
                ? `No published practice exams for ${activeSubject.name} yet.`
                : 'Check back soon — practice exams are being added regularly.'}
            </p>
            {activeSubject && (
              <Link
                href="/practice-exams"
                className="mt-4 inline-block text-sm text-blue-600 hover:underline"
              >
                View all subjects →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map(exam => (
              <PracticeExamCard key={exam.id} exam={exam} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}