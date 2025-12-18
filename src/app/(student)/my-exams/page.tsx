// src/app/(student)/my-exams/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Clock,
  FileQuestion,
  Search,
  Play,
  CheckCircle2,
  BookOpen,
  Loader2,
  Trophy,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface MyExam {
  id: string
  title: string
  slug: string
  subject: string
  subjectSlug: string
  thumbnail: string
  duration: number
  totalQuestions: number
  totalMarks: number
  difficulty: 'easy' | 'medium' | 'hard'
  purchasedAt: string
  validUntil: string
  hasAttempted: boolean
  lastAttemptStatus: string | null
  lastScore: number | null
  lastScorePercentage: number | null
  lastAttemptDate: string | null
}

export default function MyExamsPage() {
  const router = useRouter()
  const [exams, setExams] = useState<MyExam[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchMyExams()
  }, [])

  const fetchMyExams = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/student/my-exams')

      if (!res.ok) {
        throw new Error('Failed to fetch exams')
      }

      const data = await res.json()
      setExams(data.exams)
    } catch (error: any) {
      console.error('Failed to fetch exams:', error)
      toast.error('Failed to load your exams')
    } finally {
      setLoading(false)
    }
  }

  const handleStartExam = (examSlug: string) => {
    router.push(`/exam/${examSlug}/start`)
  }

  const filteredExams = exams.filter((exam) =>
    exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exam.subject.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-700'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700'
      case 'hard':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return null
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return null
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Exams</h1>
        <p className="mt-2 text-gray-600">
          Quick access to all your enrolled exams
        </p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search your exams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {searchQuery && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Found {filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''}
              </span>
              {filteredExams.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                >
                  Clear
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty State */}
      {!loading && exams.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={BookOpen}
              title="No exams enrolled yet"
              description="Browse our exam catalog and enroll in your first exam to get started"
              action={{
                label: 'Browse Exams',
                onClick: () => router.push('/exams'),
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* No Search Results */}
      {!loading && exams.length > 0 && filteredExams.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={Search}
              title="No matching exams"
              description={`No exams found matching "${searchQuery}"`}
              action={{
                label: 'Clear Search',
                onClick: () => setSearchQuery(''),
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Exams Grid */}
      {!loading && filteredExams.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam, index) => (
            <Card
              key={exam.id}
              className="card-hover overflow-hidden animate-scale-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardContent className="p-0">
                {/* Blue Gradient Thumbnail */}
                <div className="relative h-40 bg-gradient-to-br from-primary-500 to-primary-700">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileQuestion className="h-16 w-16 text-white opacity-50" />
                  </div>
                  <div className="absolute top-3 left-3">
                    <Badge className={getDifficultyColor(exam.difficulty)}>
                      {exam.difficulty}
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-green-500 text-white">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Enrolled
                    </Badge>
                  </div>
                </div>

                {/* Exam Info */}
                <div className="p-4">
                  <div className="mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {exam.subject}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-gray-900 line-clamp-2 mb-3">
                    {exam.title}
                  </h3>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{exam.duration}min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileQuestion className="h-4 w-4" />
                      <span>{exam.totalQuestions} Q</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4" />
                      <span>{exam.totalMarks}</span>
                    </div>
                  </div>

                  {/* Last Attempt Info */}
                  {exam.hasAttempted && exam.lastScore !== null && (
                    <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Last Score:</span>
                        <span className="font-semibold text-blue-700">
                          {exam.lastScore}/{exam.totalMarks} ({exam.lastScorePercentage}%)
                        </span>
                      </div>
                      {exam.lastAttemptDate && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>{getTimeAgo(exam.lastAttemptDate)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Start Exam Button */}
                  <Button
                    className="w-full"
                    onClick={() => handleStartExam(exam.slug)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {exam.hasAttempted ? 'Retake Exam' : 'Start Exam'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results Count */}
      {!loading && filteredExams.length > 0 && (
        <div className="text-center text-sm text-gray-600">
          Showing {filteredExams.length} of {exams.length} enrolled exams
        </div>
      )}
    </div>
  )
}