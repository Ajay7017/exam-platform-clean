// src/app/(marketing)/practice-exams/[slug]/PracticeExamClient.tsx
'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, CheckCircle2 } from 'lucide-react'
import { PracticeQuestion } from '@/components/exam/PracticeQuestion'

interface PracticeOption {
  id: string
  text: string
  optionKey: string
  isCorrect: boolean
  imageUrl: string | null
}

interface PracticeExamQuestion {
  id: string
  statement: string
  imageUrl: string | null
  explanation: string | null
  type: string
  options: PracticeOption[]
}

interface PracticeExam {
  id: string
  title: string
  slug: string
  description: string | null
  questionCount: number
  subject: { id: string; name: string; slug: string }
  questions: PracticeExamQuestion[]
}

interface Props {
  exam: PracticeExam
}

export function PracticeExamClient({ exam }: Props) {
  // Track how many questions have been answered (checked)
  const [answeredCount, setAnsweredCount] = useState(0)

  const handleAnswered = useCallback(() => {
    setAnsweredCount(prev => prev + 1)
  }, [])

  const totalQuestions = exam.questions.length
  const allAnswered = answeredCount === totalQuestions

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-16">

      {/* ── Sticky progress bar ─────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Back link */}
          <Link
            href="/practice-exams"
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            All Practice Exams
          </Link>

          {/* Progress indicator */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {answeredCount} of {totalQuestions} answered
            </span>
            {/* Progress pill */}
            <div className="hidden sm:block w-32 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500"
                style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
            {exam.subject.name}
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            {exam.title}
          </h1>
          {exam.description && (
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              {exam.description}
            </p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">
            {totalQuestions} question{totalQuestions !== 1 ? 's' : ''} · Click an option and press{' '}
            <span className="font-medium text-gray-600 dark:text-gray-300">Check Answer</span> to reveal the result
          </p>
        </div>
      </div>

      {/* ── Questions ───────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {exam.questions.map((question, index) => (
          <PracticeQuestion
            key={question.id}
            question={question}
            questionNumber={index + 1}
            onAnswered={handleAnswered}
          />
        ))}

        {/* ── Completion banner — shown once all answered ─────────── */}
        {allAnswered && totalQuestions > 0 && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/40">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                All done!
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                You answered all {totalQuestions} questions. Great work!
              </p>
            </div>
            <Link
              href="/practice-exams"
              className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
            >
              Try Another Practice Exam
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}