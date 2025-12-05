// src/app/(student)/exam/take/[ateemptId]/page.tsx

'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Loader2, User, CheckCircle2, Maximize2, Minimize2 } from 'lucide-react'
// Add this import at the top
import { ExamLockdown } from '@/components/exam/ExamLockdown'

interface Option {
  key: string
  text: string
  imageUrl: string | null
}

interface Question {
  id: string
  sequence: number
  statement: string
  imageUrl: string | null
  topic: string
  marks: number
  negativeMarks: number
  difficulty: 'easy' | 'medium' | 'hard'
  options: Option[]
}

interface ExamData {
  attemptId: string
  examId: string
  examTitle: string
  duration: number
  totalQuestions: number
  expiresAt: string
  allowReview: boolean
  questions: Question[]
}

export default function ExamInterface() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const attemptId = params.attemptId as string

  const [exam, setExam] = useState<ExamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | null>>({})
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({})
  const [visitedQuestions, setVisitedQuestions] = useState<Set<string>>(new Set())
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [isMaximizeMode, setIsMaximizeMode] = useState(false)
  const saveTimerRef = useRef<NodeJS.Timeout>()

  // Fetch exam data on mount
  useEffect(() => {
    fetchExamData()
  }, [attemptId])

  const fetchExamData = async () => {
    try {
      setLoading(true)
      
      const res = await fetch(`/api/attempts/${attemptId}`)

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to load exam')
      }

      const data = await res.json()
      setExam(data)

      if (data.savedAnswers && typeof data.savedAnswers === 'object') {
        setAnswers(data.savedAnswers)
      }

      const expiresAt = new Date(data.expiresAt).getTime()
      const now = Date.now()
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000))
      setTimeRemaining(remaining)

    } catch (error: any) {
      console.error('Failed to load exam:', error)
      toast.error(error.message || 'Failed to load exam')
      router.push('/exams')
    } finally {
      setLoading(false)
    }
  }

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === 0 || !exam) return

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmit(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timeRemaining, exam])

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!exam) return

    saveTimerRef.current = setInterval(() => {
      saveAnswers()
    }, 30000)

    return () => {
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current)
      }
    }
  }, [answers, markedForReview, exam])

  // Anti-cheating & Fullscreen Listener
  useEffect(() => {
    if (!exam) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // ExamLockdown handles most of this, but keeping for redundancy if needed
        // fetch(`/api/attempts/${exam.attemptId}/violation`...) 
      }
    }

    const handleFullScreenChange = () => {
       setIsMaximizeMode(!!document.fullscreenElement)
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      return false
    }

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      return false
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('fullscreenchange', handleFullScreenChange)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('cut', handleCopy)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('fullscreenchange', handleFullScreenChange)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('cut', handleCopy)
    }
  }, [exam])

  const toggleFullScreen = async () => {
    if (!document.fullscreenElement) {
        try {
            await document.documentElement.requestFullscreen()
        } catch (err) {
            console.error(err)
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen()
        }
    }
  }

  const saveAnswers = async () => {
    if (!exam) return
    try {
      const answersToSave = Object.entries(answers).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption,
        markedForReview: markedForReview[questionId] || false
      }))
      await fetch(`/api/attempts/${exam.attemptId}/save-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersToSave })
      })
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }

  const handleOptionSelect = (questionId: string, optionKey: string) => {
    setVisitedQuestions(prev => new Set(prev).add(questionId))
    setAnswers(prev => ({
      ...prev,
      [questionId]: prev[questionId] === optionKey ? null : optionKey
    }))
  }

  const handleClearAnswer = () => {
    const questionId = exam?.questions[currentQuestion]?.id
    if (questionId) {
      setVisitedQuestions(prev => new Set(prev).add(questionId))
      setAnswers(prev => ({ ...prev, [questionId]: null }))
      setMarkedForReview(prev => ({ ...prev, [questionId]: false }))
    }
  }

  const handleSaveAndNext = () => {
    const questionId = exam?.questions[currentQuestion]?.id
    if (questionId) {
      setVisitedQuestions(prev => new Set(prev).add(questionId))
      if (answers[questionId]) {
        setMarkedForReview(prev => ({ ...prev, [questionId]: false }))
      }
    }
    if (currentQuestion < (exam?.totalQuestions || 0) - 1) {
      setCurrentQuestion(prev => prev + 1)
    }
  }

  const handleSaveAndMarkForReview = () => {
    const questionId = exam?.questions[currentQuestion]?.id
    if (questionId) {
      setVisitedQuestions(prev => new Set(prev).add(questionId))
      setMarkedForReview(prev => ({ ...prev, [questionId]: true }))
    }
  }

  const handleMarkForReviewAndNext = () => {
    handleSaveAndMarkForReview()
    if (currentQuestion < (exam?.totalQuestions || 0) - 1) {
      setCurrentQuestion(prev => prev + 1)
    }
  }

  // Update the handleSubmit function to mark submission
  const handleSubmit = async (autoSubmit = false) => {
    if (!exam) return

    if (!autoSubmit) {
      setShowSubmitConfirm(true)
      return
    }

    setSubmitting(true)

    try {
      // Allow submission to proceed without warnings
      const lockdownElement = document.querySelector('[data-allow-submission]') as any
      if (lockdownElement?.dataset?.allowSubmission) {
        const allowSubmission = new Function('return ' + lockdownElement.dataset.allowSubmission)()
        allowSubmission()
      }

      await saveAnswers()
      const res = await fetch(`/api/attempts/${exam.attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!res.ok) throw new Error('Failed to submit exam')
      
      toast.success('Exam submitted successfully!')
      router.push(`/results/${exam.attemptId}`)
    } catch (error: any) {
      console.error('Submission error:', error)
      toast.error(error.message || 'Failed to submit exam.')
      setSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Memoized Status Logic
  const questionStatuses = useMemo(() => {
    if (!exam) return []
    return exam.questions.map(q => {
        const savedAns = answers[q.id];
        const hasValidAnswer = !!savedAns && q.options.some(opt => opt.key === savedAns);
        const isMarked = !!markedForReview[q.id];
        const isVisited = visitedQuestions.has(q.id);

        if (hasValidAnswer && isMarked) return 'ans_marked';
        if (hasValidAnswer) return 'answered';
        if (isMarked) return 'marked';
        if (isVisited) return 'not_answered';
        return 'not_visited';
    });
  }, [exam, answers, markedForReview, visitedQuestions]);

  const stats = useMemo(() => {
      const counts = { notVisited: 0, notAnswered: 0, answered: 0, marked: 0, ansMarked: 0 };
      questionStatuses.forEach(status => {
          if (status === 'not_visited') counts.notVisited++;
          if (status === 'not_answered') counts.notAnswered++;
          if (status === 'answered') counts.answered++;
          if (status === 'marked') counts.marked++;
          if (status === 'ans_marked') counts.ansMarked++;
      });
      return counts;
  }, [questionStatuses]);


  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!exam) return null;

  const question = exam.questions[currentQuestion]

  return (
    <ExamLockdown 
      attemptId={attemptId}
      onAutoSubmit={() => handleSubmit(true)}
    >
        <div className="fixed inset-0 z-[50] bg-gray-100 flex flex-col w-screen h-screen overflow-hidden">
        
        {/* Header */}
        <div className="bg-white border-b shadow-sm shrink-0">
            <div className="px-6 py-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                <div className="w-16 h-16 border-2 border-gray-300 rounded flex items-center justify-center bg-gray-50 overflow-hidden">
                    {session?.user?.image ? (
                    <img src={session.user.image} alt="Profile" className="w-full h-full object-cover"/>
                    ) : (
                    <User className="w-8 h-8 text-gray-400" />
                    )}
                </div>
                <div>
                    <div className="text-sm text-gray-600">
                    Candidate Name: <span className="font-semibold text-orange-600 uppercase">{session?.user?.name || 'Student'}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                    Exam Name: <span className="font-semibold text-orange-600 uppercase">{exam.examTitle}</span>
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-3 mt-1">
                    <span>Remaining Time:</span>
                    <span className="font-bold text-lg px-3 py-0.5 rounded bg-[#00A9E0] text-white">
                        {formatTime(timeRemaining)}
                    </span>
                    </div>
                </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={toggleFullScreen}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition"
                        title={isMaximizeMode ? "Exit Fullscreen" : "Enter Fullscreen"}
                    >
                        {isMaximizeMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        {isMaximizeMode ? "Exit Fullscreen" : "Fullscreen"}
                    </button>
                    <div className="px-4 py-2 bg-gray-100 rounded text-sm font-medium">English</div>
                </div>
            </div>
            </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Main Question Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
            
            {/* Question Title Bar */}
            <div className="px-6 py-4 border-b bg-white flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">Question No. {currentQuestion + 1}</h2>
                <div className="text-sm font-medium text-gray-500 flex gap-4">
                    <span>Marks: +{question.marks}</span>
                    <span>Negative: -{question.negativeMarks}</span>
                </div>
            </div>

            {/* Scrollable Question Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-white">
                <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <p className="text-lg leading-relaxed whitespace-pre-wrap font-medium text-gray-800">{question.statement}</p>
                    {question.imageUrl && (
                    <img src={question.imageUrl} alt="Question" className="max-w-full h-auto rounded-lg mt-4 border shadow-sm"/>
                    )}
                </div>

                <div className="space-y-4">
                    {question.options.map((option, index) => (
                    <div
                        key={option.key}
                        onClick={() => handleOptionSelect(question.id, option.key)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        answers[question.id] === option.key
                            ? 'border-blue-600 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                    >
                        <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                            answers[question.id] === option.key ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-400 text-gray-500'
                        }`}>
                            {answers[question.id] === option.key && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div className="text-base text-gray-700 font-medium">{option.text}</div>
                        </div>
                        {option.imageUrl && (
                        <img src={option.imageUrl} alt={`Option ${option.key}`} className="max-w-full h-auto rounded mt-3 ml-9 border"/>
                        )}
                    </div>
                    ))}
                </div>
                </div>
            </div>

            {/* Fixed Bottom Navigation */}
            <div className="px-6 py-4 border-t bg-gray-50 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-3 max-w-full">
                <div className="flex gap-2 flex-wrap">
                    <button onClick={handleSaveAndNext} className="px-6 py-2 bg-green-600 text-white rounded shadow-sm font-semibold hover:bg-green-700 transition">SAVE & NEXT</button>
                    <button onClick={handleClearAnswer} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 shadow-sm rounded font-semibold hover:bg-gray-50 transition">CLEAR RESPONSE</button>
                    <button onClick={handleSaveAndMarkForReview} className="px-6 py-2 bg-orange-500 text-white rounded shadow-sm font-semibold hover:bg-orange-600 transition">SAVE & MARK FOR REVIEW</button>
                    <button onClick={handleMarkForReviewAndNext} className="px-6 py-2 bg-blue-600 text-white rounded shadow-sm font-semibold hover:bg-blue-700 transition">MARK FOR REVIEW & NEXT</button>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))} disabled={currentQuestion === 0} className="px-4 py-2 bg-gray-200 text-gray-700 rounded font-semibold hover:bg-gray-300 disabled:opacity-50"> &lt;&lt; BACK </button>
                    <button onClick={handleSaveAndNext} disabled={currentQuestion === exam.totalQuestions - 1} className="px-4 py-2 bg-gray-200 text-gray-700 rounded font-semibold hover:bg-gray-300 disabled:opacity-50"> NEXT &gt;&gt; </button>
                </div>
                </div>
            </div>
            </div>

            {/* Right Sidebar - Palette */}
            <div className="w-80 bg-white border-l flex flex-col shrink-0">
            <div className="p-4 overflow-y-auto flex-1">
                <div className="mb-6 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">Legend</h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs text-gray-600 font-medium">
                    <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-50 border border-gray-300 rounded flex items-center justify-center text-gray-500 font-bold shadow-sm">{stats.notVisited}</div>
                    <span>Not Visited</span>
                    </div>
                    <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-500 text-white rounded flex items-center justify-center font-bold shadow-sm">{stats.notAnswered}</div>
                    <span>Not Answered</span>
                    </div>
                    <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-500 text-white rounded flex items-center justify-center font-bold shadow-sm">{stats.answered}</div>
                    <span>Answered</span>
                    </div>
                    <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold shadow-sm">{stats.marked}</div>
                    <span>Marked for Review</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-2 mt-1">
                    <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center relative font-bold shadow-sm">
                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border border-white"><CheckCircle2 className="w-3 h-3 text-white" /></div>
                    </div>
                    <span>Ans & Marked for Review (Will be evaluated)</span>
                    </div>
                </div>
                </div>

                <div className="mb-2 font-bold text-gray-700 text-sm">Question Palette:</div>
                <div className="grid grid-cols-5 gap-2">
                {exam.questions.map((q, index) => {
                    const status = questionStatuses[index];
                    const isCurrent = index === currentQuestion;
                    
                    let baseClasses = "w-full aspect-square flex items-center justify-center text-sm font-bold border transition-all shadow-sm relative";
                    let statusClasses = "";
                    let showReviewIndicator = false;

                    switch (status) {
                        case 'ans_marked':
                            statusClasses = "bg-purple-600 text-white border-purple-700 rounded-full";
                            showReviewIndicator = true;
                            break;
                        case 'answered':
                            statusClasses = "bg-green-500 text-white border-green-600 rounded";
                            break;
                        case 'marked':
                            statusClasses = "bg-purple-600 text-white border-purple-700 rounded-full";
                            break;
                        case 'not_answered':
                            statusClasses = "bg-red-500 text-white border-red-600 rounded";
                            break;
                        default:
                            statusClasses = "bg-white text-black border-gray-300 rounded hover:bg-gray-50";
                            break;
                    }

                    return (
                    <button
                        key={q.id}
                        onClick={() => setCurrentQuestion(index)}
                        className={`${baseClasses} ${statusClasses} ${isCurrent ? 'ring-2 ring-blue-500 ring-offset-2 z-10' : ''}`}
                    >
                        {index + 1}
                        {showReviewIndicator && (
                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border border-white z-10">
                            <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                        </div>
                        )}
                    </button>
                    )
                })}
                </div>
            </div>

            <div className="p-4 border-t bg-gray-50 mt-auto">
                <button onClick={() => handleSubmit(false)} disabled={submitting} className="w-full px-4 py-3 bg-blue-600 text-white rounded shadow font-bold hover:bg-blue-700 disabled:opacity-50 transition uppercase tracking-wide">
                {submitting ? 'Submitting...' : 'Submit Test'}
                </button>
            </div>
            </div>
        </div>

        {showSubmitConfirm && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full border border-gray-100">
                <h3 className="text-2xl font-bold mb-2 text-gray-800">Submit Exam?</h3>
                <p className="text-gray-500 mb-6">You are about to submit your exam. Please confirm.</p>
                <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-2xl font-bold text-green-600">{stats.answered + stats.ansMarked}</div>
                        <div className="text-xs text-gray-500 font-medium uppercase">Answered</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-red-500">{stats.notAnswered}</div>
                        <div className="text-xs text-gray-500 font-medium uppercase">Not Answered</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-purple-600">{stats.marked}</div>
                        <div className="text-xs text-gray-500 font-medium uppercase">Marked for Review</div>
                    </div>
                </div>
                </div>
                <div className="flex gap-3">
                <button onClick={() => setShowSubmitConfirm(false)} className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition">Return to Exam</button>
                <button onClick={() => { setShowSubmitConfirm(false); handleSubmit(true); }} className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition shadow-lg shadow-green-600/20">Yes, Submit</button>
                </div>
            </div>
            </div>
        )}
      </div>
    </ExamLockdown>
  )
}