// src/app/(admin)/admin/exams/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Clock,
  FileQuestion,
  Users,
  Edit,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

interface Option {
  key: string
  text: string
  imageUrl?: string
  isCorrect: boolean
}

interface Question {
  id: string
  statement: string
  imageUrl?: string
  topic: {
    id: string
    name: string
    slug: string
  }
  marks: number
  negativeMarks: number
  difficulty: string
  explanation?: string
  sequence: number
  options: Option[]
}

interface ExamDetails {
  id: string
  title: string
  slug: string
  subject?: {
    id: string
    name: string
    slug: string
  }
  duration: number
  totalMarks: number
  price: number
  isFree: boolean
  difficulty: string
  thumbnail?: string
  instructions?: string
  randomizeOrder: boolean
  allowReview: boolean
  isPublished: boolean
  totalAttempts: number
  totalPurchases: number
  questions: Question[]
  createdAt: string
  updatedAt: string
}

export default function AdminExamViewPage() {
  const router = useRouter()
  const params = useParams()
  const examId = params.id as string

  const [exam, setExam] = useState<ExamDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchExamDetails()
  }, [examId])

  const fetchExamDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/exams/${examId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch exam details')
      }
      
      const data = await response.json()
      setExam(data)
    } catch (error) {
      console.error('Failed to fetch exam:', error)
      toast.error('Failed to load exam details')
    } finally {
      setLoading(false)
    }
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileQuestion className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-600 text-lg font-medium">Exam not found</p>
            <Button onClick={() => router.push('/admin/exams')} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Exams
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/exams')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{exam.title}</h1>
            <p className="text-gray-600 mt-1">
              {exam.subject?.name || 'Multi-Subject'} • {exam.questions.length} Questions
            </p>
          </div>
        </div>
        <Button onClick={() => router.push(`/admin/exams/${examId}/edit`)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Exam
        </Button>
      </div>

      {/* Exam Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge
                  variant={exam.isPublished ? 'default' : 'secondary'}
                  className="mt-2"
                >
                  {exam.isPublished ? 'Published' : 'Draft'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {exam.duration}min
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Marks</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {exam.totalMarks}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Attempts</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {exam.totalAttempts}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exam Details */}
      <Card>
        <CardHeader>
          <CardTitle>Exam Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-gray-600">Difficulty</p>
              <Badge className={`mt-1 ${getDifficultyColor(exam.difficulty)}`}>
                {exam.difficulty}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Price</p>
              <p className="text-lg font-semibold mt-1">
                {exam.isFree ? (
                  <span className="text-green-600">Free</span>
                ) : (
                  `₹${(exam.price / 100).toFixed(2)}`
                )}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Randomize Order</p>
              <p className="mt-1">{exam.randomizeOrder ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Allow Review</p>
              <p className="mt-1">{exam.allowReview ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {exam.instructions && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Instructions</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{exam.instructions}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <CardTitle>Questions ({exam.questions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {exam.questions.map((question, index) => (
              <div key={question.id} className="border rounded-lg p-6 bg-white">
                {/* Question Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-3 py-1 rounded">
                        Q{index + 1}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {question.topic.name}
                      </Badge>
                      <Badge className={`text-xs ${getDifficultyColor(question.difficulty)}`}>
                        {question.difficulty}
                      </Badge>
                    </div>
                    <p className="text-base text-gray-900 leading-relaxed">
                      {question.statement}
                    </p>
                    {question.imageUrl && (
                      <img
                        src={question.imageUrl}
                        alt="Question"
                        className="mt-3 rounded-lg max-w-md"
                      />
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm text-gray-600">Marks</p>
                    <p className="text-lg font-semibold text-green-600">
                      +{question.marks}
                    </p>
                    {question.negativeMarks > 0 && (
                      <p className="text-sm text-red-600">
                        -{question.negativeMarks}
                      </p>
                    )}
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Options */}
                <div className="grid gap-3 md:grid-cols-2">
                  {question.options.map((option) => (
                    <div
                      key={option.key}
                      className={`p-4 rounded-lg border-2 ${
                        option.isCorrect
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex-shrink-0">
                          <span className="text-sm font-semibold">
                            {option.key}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{option.text}</p>
                          {option.imageUrl && (
                            <img
                              src={option.imageUrl}
                              alt={`Option ${option.key}`}
                              className="mt-2 rounded max-w-xs"
                            />
                          )}
                        </div>
                        {option.isCorrect && (
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Explanation */}
                {question.explanation && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900 mb-2">
                      Explanation:
                    </p>
                    <p className="text-sm text-blue-800">{question.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}