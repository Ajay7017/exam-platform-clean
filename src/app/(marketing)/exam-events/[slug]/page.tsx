import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  CalendarDays, FileText, Download, Clock,
  ChevronRight, CheckCircle2, ExternalLink, BookOpen
} from 'lucide-react'
import { ScoreCalculator } from './ScoreCalculator'

interface Resource {
  id: string
  label: string
  type: string
  driveLink: string | null
  status: 'COMING_SOON' | 'LIVE' | 'REMOVED'
  sortOrder: number
}

interface ExamEvent {
  id: string
  title: string
  slug: string
  description: string | null
  examDate: string | null
  metaTitle: string | null
  metaDescription: string | null
  calculatorEnabled: boolean
  totalQuestions: number
  totalMarks: number
  correctMarks: number
  negativeMarks: number
  cutoffGeneral: number | null
  cutoffOBC: number | null
  cutoffSC: number | null
  cutoffST: number | null
  resources: Resource[]
}

async function getExamEvent(slug: string): Promise<ExamEvent | null> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/exam-events/${slug}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.examEvent || null
  } catch {
    return null
  }
}

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const event = await getExamEvent(params.slug)
  if (!event) return { title: 'Not Found' }

  return {
    title: event.metaTitle || `${event.title} — Mockzy`,
    description: event.metaDescription ||
      `Download ${event.title} question paper, answer key and solutions. Free resources on Mockzy.`,
    openGraph: {
      title: event.metaTitle || `${event.title} — Mockzy`,
      description: event.metaDescription ||
        `Download ${event.title} question paper, answer key and solutions. Free resources on Mockzy.`,
      url: `https://mockzy.co.in/exam-events/${event.slug}`,
      siteName: 'Mockzy',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: event.metaTitle || `${event.title} — Mockzy`,
      description: event.metaDescription ||
        `Download ${event.title} question paper, answer key and solutions. Free resources on Mockzy.`,
    },
    alternates: {
      canonical: `https://mockzy.co.in/exam-events/${event.slug}`,
    },
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

const TYPE_LABELS: Record<string, string> = {
  QUESTION_PAPER: 'Question Paper',
  ANSWER_KEY: 'Answer Key',
  SOLUTIONS: 'Solutions / Explanations',
  OTHER: 'Resource',
}

const TYPE_ICONS: Record<string, any> = {
  QUESTION_PAPER: FileText,
  ANSWER_KEY: CheckCircle2,
  SOLUTIONS: BookOpen,
  OTHER: Download,
}

function ExamEventJsonLd({ event }: { event: ExamEvent }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.metaDescription ||
      `Download ${event.title} question paper, answer key and solutions. Free resources on Mockzy.`,
    ...(event.examDate && {
      startDate: event.examDate,
      endDate: event.examDate,
    }),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: {
      '@type': 'VirtualLocation',
      url: `https://mockzy.co.in/exam-events/${event.slug}`,
    },
    organizer: {
      '@type': 'Organization',
      name: 'Mockzy',
      url: 'https://mockzy.co.in',
    },
    url: `https://mockzy.co.in/exam-events/${event.slug}`,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

function ResourceCard({ resource }: { resource: Resource }) {
  const Icon = TYPE_ICONS[resource.type] || FileText
  const isLive = resource.status === 'LIVE'
  const hasLink = isLive && resource.driveLink

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
      isLive
        ? 'bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm'
        : 'bg-gray-50 border-gray-100'
    }`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isLive ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'
      }`}>
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${isLive ? 'text-gray-900' : 'text-gray-400'}`}>
          {resource.label}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {TYPE_LABELS[resource.type] || resource.type}
        </p>
      </div>

      {isLive && hasLink ? (
        
          <a href={resource.driveLink!}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open
        </a>
      ) : isLive && !hasLink ? (
        <span className="flex items-center gap-1 text-xs text-green-600 font-medium shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" /> Available
        </span>
      ) : (
        <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-100 rounded-lg shrink-0">
          <Clock className="w-3 h-3" />
          Coming Soon
        </span>
      )}
    </div>
  )
}

export default async function ExamEventDetailPage(
  { params }: { params: { slug: string } }
) {
  const event = await getExamEvent(params.slug)
  if (!event) notFound()

  const liveResources = event.resources.filter(r => r.status === 'LIVE')

  return (
    <div className="min-h-screen bg-gray-50">

      {/* JSON-LD structured data */}
      <ExamEventJsonLd event={event} />

      {/* Hero */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-10">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
            <Link href="/" className="hover:text-gray-600">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/exam-events" className="hover:text-gray-600">Answer Keys</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-600">{event.title}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              {liveResources.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Resources Live
                </span>
              )}

              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug">
                {event.title}
              </h1>

              {event.description && (
                <p className="mt-2 text-gray-500 max-w-xl">
                  {event.description}
                </p>
              )}

              {event.examDate && (
                <div className="flex items-center gap-1.5 mt-3 text-sm text-gray-500">
                  <CalendarDays className="w-4 h-4" />
                  Exam Date: <span className="font-medium text-gray-700">{formatDate(event.examDate)}</span>
                </div>
              )}
            </div>

            <Link
              href="/exams"
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shrink-0 shadow-sm"
            >
              Practice Mock Tests
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Resources */}
        {event.resources.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Downloads & Resources</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Click 'Open' to view or download from Google Drive
              </p>
            </div>
            <div className="p-4 space-y-3">
              {event.resources.map(resource => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Resources coming soon</p>
            <p className="text-xs mt-1">Check back after the exam</p>
          </div>
        )}

        {/* Score Calculator */}
        {event.calculatorEnabled && (
          <ScoreCalculator
            totalQuestions={event.totalQuestions}
            totalMarks={event.totalMarks}
            correctMarks={event.correctMarks}
            negativeMarks={event.negativeMarks}
            cutoffGeneral={event.cutoffGeneral}
            cutoffOBC={event.cutoffOBC}
            cutoffSC={event.cutoffSC}
            cutoffST={event.cutoffST}
          />
        )}

        {/* CTA Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-violet-600 rounded-xl p-6 text-white">
          <h3 className="font-bold text-lg">Prepare for Next Year with Mockzy</h3>
          <p className="text-blue-100 text-sm mt-1">
            Practice with 200,000+ questions in real exam conditions. Free mock tests available.
          </p>
          <Link
            href="/exams"
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-white text-blue-600 text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors"
          >
            Start Practicing Free
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  )
}