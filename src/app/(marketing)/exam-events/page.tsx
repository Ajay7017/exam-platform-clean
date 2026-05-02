// src/app/(marketing)/exam-events/page.tsx
import Link from 'next/link'
import { CalendarDays, FileText, ChevronRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Exam Answer Keys & Solutions — Mockzy',
  description:
    'Download answer keys, question papers and solutions for NEET, JEE, CUET and more. Free resources by Mockzy.',
}

interface ExamEvent {
  id: string
  title: string
  slug: string
  description: string | null
  examDate: string | null
  metaTitle: string | null
  _count: { resources: number }
}

async function getExamEvents(): Promise<ExamEvent[]> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/exam-events`, {
      next: { revalidate: 60 }, // revalidate every 60 seconds
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.examEvents || []
  } catch {
    return []
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function ExamEventsPage() {
  const examEvents = await getExamEvents()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Answer Keys & Solutions
          </h1>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto">
            Download official question papers, answer keys and detailed solutions
            for NEET, JEE, CUET and other major exams — free on Mockzy.
          </p>
        </div>
      </div>

      {/* Events grid */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        {examEvents.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No exam events published yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {examEvents.map(event => (
              <Link
                key={event.id}
                href={`/exam-events/${event.slug}`}
                className="group bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-200 transition-all duration-200"
              >
                {/* Top accent */}
                <div className="h-1 w-12 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 mb-4 group-hover:w-full transition-all duration-300" />

                <h2 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">
                  {event.title}
                </h2>

                {event.description && (
                  <p className="mt-1.5 text-sm text-gray-500 line-clamp-2">
                    {event.description}
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {event.examDate && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {formatDate(event.examDate)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      {event._count.resources} resource{event._count.resources !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}