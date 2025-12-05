// src/app/(admin)/admin/exams/[id]/edit/page.tsx

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Save, X } from 'lucide-react'

interface Subject {
  id: string
  name: string
  slug: string
}

interface Topic {
  id: string
  name: string
  subjectId: string
  subjectName: string
}

interface Question {
  id: string
  statement: string
  fullStatement: string
  topicId: string
  topicName: string
  subjectId: string
  subjectName: string
  difficulty: string
  marks: number
}

export default function EditExamPage() {
  const router = useRouter()
  const params = useParams()
  const examId = params.id as string

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [allTopics, setAllTopics] = useState<Topic[]>([])
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    isMultiSubject: false,
    subjectId: '',
    selectedSubjects: [] as string[],
    durationMin: 60,
    price: 0,
    isFree: true,
    instructions: '',
    randomizeOrder: false,
    allowReview: true,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    thumbnail: '',
  })

  // Filter state
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [topicFilter, setTopicFilter] = useState<string>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')

  // Fetch initial data
  useEffect(() => {
    fetchSubjects()
    fetchExamData()
  }, [examId])

  // Handle subject mode change
  useEffect(() => {
    if (!loading && subjects.length > 0) {
      if (formData.isMultiSubject) {
        if (formData.selectedSubjects.length > 0) {
          fetchTopicsForMultipleSubjects(formData.selectedSubjects)
          fetchQuestionsForMultipleSubjects(formData.selectedSubjects)
        }
      } else {
        if (formData.subjectId) {
          fetchTopics(formData.subjectId)
          fetchQuestions(formData.subjectId)
        }
      }
    }
  }, [formData.isMultiSubject, formData.subjectId, formData.selectedSubjects, subjects])

  const filteredQuestions = useMemo(() => {
    return allQuestions.filter(q => {
      const matchesSubject = subjectFilter === 'all' || q.subjectId === subjectFilter
      const matchesTopic = topicFilter === 'all' || q.topicId === topicFilter
      const matchesDifficulty = difficultyFilter === 'all' || q.difficulty === difficultyFilter
      return matchesSubject && matchesTopic && matchesDifficulty
    })
  }, [allQuestions, subjectFilter, topicFilter, difficultyFilter])

  const areAllFilteredQuestionsSelected = useMemo(() => {
    if (filteredQuestions.length === 0) return false
    return filteredQuestions.every(q => selectedQuestions.includes(q.id))
  }, [filteredQuestions, selectedQuestions])

  const fetchExamData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/exams/${examId}`)
      
      if (!response.ok) throw new Error('Failed to fetch exam')
      
      const data = await response.json()
      
      // Set form data
      setFormData({
        title: data.title,
        slug: data.slug,
        isMultiSubject: !data.subject,
        subjectId: data.subject?.id || '',
        selectedSubjects: [],
        durationMin: data.duration,
        price: data.price,
        isFree: data.isFree,
        instructions: data.instructions || '',
        randomizeOrder: data.randomizeOrder,
        allowReview: data.allowReview,
        difficulty: data.difficulty,
        thumbnail: data.thumbnail || '',
      })
      
      // Set selected questions
      setSelectedQuestions(data.questions.map((q: any) => q.id))
    } catch (error) {
      console.error('Failed to fetch exam:', error)
      toast.error('Failed to load exam data')
      router.push('/admin/exams')
    } finally {
      setLoading(false)
    }
  }

  const fetchSubjects = async () => {
    try {
      const res = await fetch('/api/admin/subjects')
      if (!res.ok) throw new Error('Failed to fetch subjects')
      const data = await res.json()
      setSubjects(data)
    } catch (error) {
      console.error('Failed to fetch subjects:', error)
      toast.error('Failed to load subjects')
    }
  }

  const fetchTopics = async (subjectId: string) => {
    try {
      const res = await fetch(`/api/admin/topics?subjectId=${subjectId}`)
      if (!res.ok) throw new Error('Failed to fetch topics')
      const data = await res.json()
      setAllTopics(data.map((t: any) => ({
        ...t,
        subjectName: subjects.find(s => s.id === t.subjectId)?.name || ''
      })))
    } catch (error) {
      console.error('Failed to fetch topics:', error)
      toast.error('Failed to load topics')
    }
  }

  const fetchTopicsForMultipleSubjects = async (subjectIds: string[]) => {
    try {
      const topicsPromises = subjectIds.map(id =>
        fetch(`/api/admin/topics?subjectId=${id}`).then(r => r.json())
      )
      const topicsArrays = await Promise.all(topicsPromises)
      const allTopicsFlat = topicsArrays.flat().map((t: any) => ({
        ...t,
        subjectName: subjects.find(s => s.id === t.subjectId)?.name || ''
      }))
      setAllTopics(allTopicsFlat)
    } catch (error) {
      console.error('Failed to fetch topics:', error)
      toast.error('Failed to load topics')
    }
  }

  const fetchQuestions = async (subjectId: string) => {
    try {
      const res = await fetch(`/api/admin/questions?subjectId=${subjectId}&limit=1000`)
      if (!res.ok) throw new Error('Failed to fetch questions')
      const data = await res.json()
      const questions = data.questions || []
      const uniqueQuestions = Array.from(new Map(questions.map((q: Question) => [q.id, q])).values()) as Question[]
      setAllQuestions(uniqueQuestions)
    } catch (error) {
      console.error('Failed to fetch questions:', error)
      toast.error('Failed to load questions')
    }
  }

  const fetchQuestionsForMultipleSubjects = async (subjectIds: string[]) => {
    try {
      const questionsPromises = subjectIds.map(id =>
        fetch(`/api/admin/questions?subjectId=${id}&limit=1000`).then(r => r.json())
      )
      const questionsArrays = await Promise.all(questionsPromises)
      const allQuestionsFlat = questionsArrays.flatMap(data => data.questions || [])
      const uniqueQuestions = Array.from(new Map(allQuestionsFlat.map((q: any) => [q.id, q])).values()) as Question[]
      setAllQuestions(uniqueQuestions)
    } catch (error) {
      console.error('Failed to fetch questions:', error)
      toast.error('Failed to load questions')
    }
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      title,
      slug: generateSlug(title),
    })
  }

  const handlePriceChange = (price: number) => {
    setFormData({
      ...formData,
      price,
      isFree: price === 0,
    })
  }

  const toggleQuestion = useCallback((questionId: string) => {
    setSelectedQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    )
  }, [])

  const selectAllInCurrentView = useCallback(() => {
    const currentQuestionIds = filteredQuestions.map(q => q.id)
    
    setSelectedQuestions(prev => {
      const allCurrentSelected = currentQuestionIds.every(id => prev.includes(id))
      
      if (allCurrentSelected) {
        return prev.filter(id => !currentQuestionIds.includes(id))
      } else {
        const newSelections = currentQuestionIds.filter(id => !prev.includes(id))
        return [...prev, ...newSelections]
      }
    })
  }, [filteredQuestions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedQuestions.length < 2) {
      toast.error('Please select at least 2 questions')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/exams/${examId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          slug: formData.slug,
          subjectId: formData.isMultiSubject ? undefined : formData.subjectId,
          durationMin: formData.durationMin,
          questionIds: selectedQuestions,
          price: formData.price,
          instructions: formData.instructions || undefined,
          randomizeOrder: formData.randomizeOrder,
          allowReview: formData.allowReview,
          difficulty: formData.difficulty,
          ...(formData.thumbnail && formData.thumbnail !== '' && { thumbnail: formData.thumbnail })
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update exam')
      }

      toast.success('Exam updated successfully!')
      router.push('/admin/exams')
    } catch (error: any) {
      console.error('Failed to update exam:', error)
      toast.error(error.message || 'Failed to update exam')
    } finally {
      setSubmitting(false)
    }
  }

  const availableSubjects = Array.from(
    new Set(allQuestions.map(q => q.subjectId))
  ).map(id => ({
    id,
    name: allQuestions.find(q => q.subjectId === id)?.subjectName || ''
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/exams')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Exams
        </Button>
        <h1 className="text-3xl font-bold">Edit Exam</h1>
        <p className="text-gray-600 mt-1">
          Update exam details and questions
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Basic Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Exam Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    required
                  />
                </div>

                {!formData.isMultiSubject && (
                  <div>
                    <Label htmlFor="subject">Subject *</Label>
                    <Select
                      value={formData.subjectId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, subjectId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration">Duration (minutes) *</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="15"
                      max="300"
                      value={formData.durationMin}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          durationMin: parseInt(e.target.value),
                        })
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, difficulty: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="price">Price (₹)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    value={formData.price / 100}
                    onChange={(e) =>
                      handlePriceChange(parseFloat(e.target.value) * 100)
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="instructions">Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={formData.instructions}
                    onChange={(e) =>
                      setFormData({ ...formData, instructions: e.target.value })
                    }
                    rows={4}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="randomize"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={formData.randomizeOrder}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          randomizeOrder: e.target.checked,
                        })
                      }
                    />
                    <Label htmlFor="randomize" className="font-normal">
                      Randomize question order
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="review"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={formData.allowReview}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          allowReview: e.target.checked,
                        })
                      }
                    />
                    <Label htmlFor="review" className="font-normal">
                      Allow review before submit
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Question Selection */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      Select Questions ({selectedQuestions.length} selected)
                    </CardTitle>
                  </div>
                  {filteredQuestions.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAllInCurrentView}
                    >
                      {areAllFilteredQuestionsSelected ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!formData.subjectId && !formData.isMultiSubject ? (
                  <p className="text-center text-gray-500 py-8">
                    Please select a subject first
                  </p>
                ) : (
                  <div className="space-y-4">
                    {/* Filters */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Filter by Topic</Label>
                        <Select value={topicFilter} onValueChange={setTopicFilter}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Topics</SelectItem>
                            {allTopics.map((topic) => (
                              <SelectItem key={topic.id} value={topic.id}>
                                {topic.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Filter by Difficulty</Label>
                        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Difficulties</SelectItem>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Question List */}
                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                      {filteredQuestions.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">
                          No questions found
                        </p>
                      ) : (
                        <div className="divide-y">
                          {filteredQuestions.map((question) => (
                            <div
                              key={question.id}
                              className="p-3 hover:bg-gray-50 cursor-pointer"
                              onClick={() => toggleQuestion(question.id)}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4 rounded border-gray-300"
                                  checked={selectedQuestions.includes(question.id)}
                                  onChange={() => toggleQuestion(question.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="flex-1">
                                  <p className="text-sm line-clamp-2">
                                    {question.fullStatement}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-500">
                                      {question.topicName}
                                    </span>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-gray-500 capitalize">
                                      {question.difficulty}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/exams')}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || selectedQuestions.length < 2}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Update Exam
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}