// src/components/student/PracticeExamCard.tsx
import Link from 'next/link'
import { FileText, ChevronRight } from 'lucide-react'

interface PracticeExamCardProps {
  exam: {
    id: string
    title: string
    slug: string
    description: string | null
    questionCount: number
    subject: {
      id: string
      name: string
      slug: string
    }
  }
}

// Deterministic colour from subject name — keeps colours stable across renders
function getSubjectAccent(subjectName: string): { bg: string; text: string; dot: string } {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    Physics:     { bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-700 dark:text-blue-400',   dot: 'bg-blue-500' },
    Chemistry:   { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
    Mathematics: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-400', dot: 'bg-violet-500' },
    Biology:     { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
    Maths:       { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-400', dot: 'bg-violet-500' },
  }
  return (
    map[subjectName] ?? {
      bg:   'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-700 dark:text-gray-300',
      dot:  'bg-gray-400',
    }
  )
}

export function PracticeExamCard({ exam }: PracticeExamCardProps) {
  const accent = getSubjectAccent(exam.subject.name)

  return (
    <Link
      href={`/practice-exams/${exam.slug}`}
      className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-3"
    >
      {/* Top accent bar — animates to full width on hover (mirrors exam-events style) */}
      <div className="h-1 w-10 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 group-hover:w-full transition-all duration-300" />

      {/* Subject badge */}
      <span
        className={`self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${accent.bg} ${accent.text}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${accent.dot}`} />
        {exam.subject.name}
      </span>

      {/* Title */}
      <h3 className="font-semibold text-gray-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
        {exam.title}
      </h3>

      {/* Description */}
      {exam.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
          {exam.description}
        </p>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
        <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <FileText className="w-3.5 h-3.5" />
          {exam.questionCount} question{exam.questionCount !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
          Start Practice
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  )
}