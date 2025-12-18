// src/app/(student)/exam/[slug]/start/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Clock, 
  FileText, 
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Play
} from 'lucide-react'
import { toast } from 'sonner'

interface ExamStartData {
  id: string
  title: string
  slug: string
  subject: string
  duration: number
  totalQuestions: number
  totalMarks: number
  instructions: string | null
  allowReview: boolean
  isFree: boolean
  isPurchased: boolean
}

export default function ExamStartPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  
  const [exam, setExam] = useState<ExamStartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    fetchExamData()
  }, [slug])

  const fetchExamData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/exams/${slug}`)
      
      if (!res.ok) {
        if (res.status === 404) {
          toast.error('Exam not found')
          router.push('/exams')
          return
        }
        throw new Error('Failed to fetch exam data')
      }
      
      const data = await res.json()
      setExam(data)
    } catch (error: any) {
      console.error('Failed to fetch exam:', error)
      toast.error('Failed to load exam details')
      router.push('/exams')
    } finally {
      setLoading(false)
    }
  }

  const handleStartExam = async () => {
    if (!agreedToTerms) {
      toast.error('Please agree to the terms and conditions')
      return
    }

    if (!exam?.isFree && !exam?.isPurchased) {
      toast.error('Please purchase this exam first')
      router.push(`/exams/${exam?.slug}`)
      return
    }
    
    try {
      setStarting(true)
      
      const res = await fetch('/api/attempts/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: exam!.id })
      })
      
      if (!res.ok) {
        const data = await res.json()
        
        if (data.canResume && data.attemptId) {
          const shouldResume = confirm('You have an active attempt. Do you want to resume it?')
          if (shouldResume) {
            router.push(`/exam/take/${data.attemptId}`)
            return
          } else {
            setStarting(false)
            return
          }
        }
        
        throw new Error(data.error || 'Failed to start exam')
      }
      
      const data = await res.json()
      toast.success('Exam started successfully!')
      router.push(`/exam/take/${data.attemptId}`)
      
    } catch (error: any) {
      console.error('Failed to start exam:', error)
      toast.error(error.message || 'Failed to start exam')
      setStarting(false)
    }
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

  return (
    <div className="max-w-5xl mx-auto p-4">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/exams')}
        disabled={starting}
        className="mb-3"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Exams
      </Button>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Left Column - Exam Info */}
        <div className="space-y-4">
          {/* Exam Header */}
          <Card>
            <CardContent className="p-4">
              <h1 className="text-2xl font-bold mb-1">{exam.title}</h1>
              <p className="text-sm text-muted-foreground mb-4">{exam.subject}</p>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-lg font-bold">{exam.duration} min</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <FileText className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">Questions</p>
                  <p className="text-lg font-bold">{exam.totalQuestions}</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">Total Marks</p>
                  <p className="text-lg font-bold">{exam.totalMarks}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardContent className="p-4">
              <h2 className="text-lg font-bold mb-3">Instructions</h2>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>• Read all questions carefully</li>
                <li>• All questions are mandatory</li>
                <li>• You can navigate between questions using the question palette</li>
                <li>• Ensure stable internet connection throughout the exam</li>
                <li>• Do not refresh the page during the exam</li>
                <li>• Your progress will be auto-saved periodically</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Guidelines & Start */}
        <div className="space-y-4">
          {/* Important Guidelines */}
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-2">Important Guidelines</h3>
                  <ul className="space-y-1 text-sm text-red-800">
                    <li>• Once started, the timer cannot be paused</li>
                    <li>• Switching tabs or windows may be flagged as suspicious activity</li>
                    <li>• Your answers are auto-saved every 30 seconds</li>
                    <li>• Exam will auto-submit when time expires</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms & Conditions */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                  className="mt-1"
                />
                <label htmlFor="terms" className="text-sm cursor-pointer leading-relaxed">
                  I have read and understood the instructions. I agree to abide by the exam rules and understand that any violation may result in disqualification.
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Start Button */}
          <Button
            size="lg"
            onClick={handleStartExam}
            disabled={!agreedToTerms || starting}
            className="w-full h-14 text-lg"
          >
            {starting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Starting Exam...
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Start Exam Now
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}