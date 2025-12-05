// src/app/(student)/exams/[slug]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Clock, 
  FileText, 
  Award, 
  Users, 
  ArrowLeft,
  Loader2,
  Lock,
  Play,
  AlertCircle,
  CheckCircle2,
  ShoppingCart
} from 'lucide-react'
import { toast } from 'sonner'
import PurchaseButton from './components/PurchaseButton'

interface ExamDetails {
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
  price: number
  isFree: boolean
  isPurchased: boolean
  instructions: string | null
  topics: string[]
  totalAttempts: number
}

export default function ExamDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  
  const [exam, setExam] = useState<ExamDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchExamDetails()
    
    // Check for payment success
    const paymentStatus = searchParams.get('payment')
    if (paymentStatus === 'success') {
      toast.success('🎉 Payment Successful!', {
        description: 'You can now start the exam. Good luck!'
      })
      // Clear the query param
      router.replace(`/exams/${slug}`)
    }
  }, [slug])

  const fetchExamDetails = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/exams/${slug}`)
      
      if (!res.ok) {
        if (res.status === 404) {
          toast.error('Exam not found')
          router.push('/exams')
          return
        }
        throw new Error('Failed to fetch exam details')
      }
      
      const data = await res.json()
      setExam(data)
    } catch (error: any) {
      console.error('Failed to fetch exam:', error)
      toast.error('Failed to load exam details')
    } finally {
      setLoading(false)
    }
  }

  const handleStartExam = () => {
    if (!exam) return
    
    if (!exam.isFree && !exam.isPurchased) {
      toast.error('Please purchase this exam first')
      return
    }
    
    // Navigate to exam start page
    router.push(`/exam/${exam.slug}/start`)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Exam not found</p>
      </div>
    )
  }

  const difficultyColors = {
    easy: 'bg-green-500',
    medium: 'bg-yellow-500',
    hard: 'bg-red-500'
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/exams')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Exams
      </Button>

      {/* Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Thumbnail */}
            <div className="w-full md:w-48 h-48 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              {exam.thumbnail ? (
                <img 
                  src={exam.thumbnail} 
                  alt={exam.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileText className="h-16 w-16 text-gray-400" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{exam.subject}</Badge>
                  <Badge className={difficultyColors[exam.difficulty]}>
                    {exam.difficulty}
                  </Badge>
                  {exam.isFree && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Free
                    </Badge>
                  )}
                  {exam.isPurchased && !exam.isFree && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Purchased
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl font-bold">{exam.title}</h1>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium">{exam.duration} min</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Questions</p>
                    <p className="font-medium">{exam.totalQuestions}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Marks</p>
                    <p className="font-medium">{exam.totalMarks}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Attempts</p>
                    <p className="font-medium">{exam.totalAttempts}</p>
                  </div>
                </div>
              </div>

              {/* Topics */}
              {exam.topics.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Topics Covered:</p>
                  <div className="flex flex-wrap gap-2">
                    {exam.topics.map((topic, idx) => (
                      <Badge key={idx} variant="secondary">{topic}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button - UPDATED WITH PAYMENT INTEGRATION */}
              <div className="pt-4">
                <PurchaseButton
                  examId={exam.id}
                  examSlug={exam.slug}
                  examTitle={exam.title}
                  price={exam.price}
                  isFree={exam.isFree}
                  isPurchased={exam.isPurchased}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      {exam.instructions && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">Instructions</h2>
            <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
              {exam.instructions}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Notice - No Preview */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">
                Question Preview Not Available
              </h3>
              <p className="text-sm text-yellow-800">
                Questions will be visible only after you start the exam. This ensures a fair testing environment for all students.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exam Info Summary */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-4">Exam Summary</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Questions:</span>
              <span className="font-medium">{exam.totalQuestions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Marks:</span>
              <span className="font-medium">{exam.totalMarks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time Allowed:</span>
              <span className="font-medium">{exam.duration} minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Difficulty Level:</span>
              <Badge className={`${difficultyColors[exam.difficulty]} capitalize`}>
                {exam.difficulty}
              </Badge>
            </div>
            {!exam.isFree && (
              <div className="flex justify-between pt-2 border-t">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-bold text-lg">₹{(exam.price / 100).toFixed(2)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}