// src/app/(admin)/admin/exams/new/page.tsx
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
import { ArrowLeft, Loader2, Plus, X } from 'lucide-react'

// Note: We are NOT using the Radix Checkbox for the list because it causes
// performance crashes ("Max update depth") when rendering/updating 1000+ items.
// We use a native input instead.

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

export default function CreateExamPage() {
  const router = useRouter()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [allTopics, setAllTopics] = useState<Topic[]>([])
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
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

  // Fetch subjects on mount
  useEffect(() => {
    fetchSubjects()
  }, [])

  // Handle subject mode change
  useEffect(() => {
    if (formData.isMultiSubject) {
      if (formData.selectedSubjects.length > 0) {
        fetchTopicsForMultipleSubjects(formData.selectedSubjects)
        fetchQuestionsForMultipleSubjects(formData.selectedSubjects)
      } else {
        setAllTopics([])
        setAllQuestions([])
        setSelectedQuestions([])
      }
    } else {
      if (formData.subjectId) {
        fetchTopics(formData.subjectId)
        fetchQuestions(formData.subjectId)
      } else {
        setAllTopics([])
        setAllQuestions([])
        setSelectedQuestions([])
      }
    }
    // Reset filters but NOT selections
    setSubjectFilter('all')
    setTopicFilter('all')
    setDifficultyFilter('all')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.isMultiSubject, formData.subjectId, formData.selectedSubjects])

  // Derived state for filters
  const filteredQuestions = useMemo(() => {
    return allQuestions.filter(q => {
      const matchesSubject = subjectFilter === 'all' || q.subjectId === subjectFilter
      const matchesTopic = topicFilter === 'all' || q.topicId === topicFilter
      const matchesDifficulty = difficultyFilter === 'all' || q.difficulty === difficultyFilter
      return matchesSubject && matchesTopic && matchesDifficulty
    })
  }, [allQuestions, subjectFilter, topicFilter, difficultyFilter])

  // Derived state for "Select All" button status
  const areAllFilteredQuestionsSelected = useMemo(() => {
    if (filteredQuestions.length === 0) return false
    return filteredQuestions.every(q => selectedQuestions.includes(q.id))
  }, [filteredQuestions, selectedQuestions])

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
      setLoading(true)
      const res = await fetch(`/api/admin/questions?subjectId=${subjectId}&limit=1000`)
      if (!res.ok) throw new Error('Failed to fetch questions')
      const data = await res.json()
      // Ensure uniqueness
      const questions = data.questions || []
      const uniqueQuestions = Array.from(new Map(questions.map((q: Question) => [q.id, q])).values()) as Question[]
      setAllQuestions(uniqueQuestions)
    } catch (error) {
      console.error('Failed to fetch questions:', error)
      toast.error('Failed to load questions')
    } finally {
      setLoading(false)
    }
  }

  const fetchQuestionsForMultipleSubjects = async (subjectIds: string[]) => {
    try {
      setLoading(true)
      const questionsPromises = subjectIds.map(id =>
        fetch(`/api/admin/questions?subjectId=${id}&limit=1000`).then(r => r.json())
      )
      const questionsArrays = await Promise.all(questionsPromises)
      const allQuestionsFlat = questionsArrays.flatMap(data => data.questions || [])
      
      // Ensure uniqueness
      const uniqueQuestions = Array.from(new Map(allQuestionsFlat.map((q: any) => [q.id, q])).values()) as Question[]
      setAllQuestions(uniqueQuestions)
    } catch (error) {
      console.error('Failed to fetch questions:', error)
      toast.error('Failed to load questions')
    } finally {
      setLoading(false)
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

  const handleMultiSubjectToggle = (checked: boolean) => {
    setFormData({
      ...formData,
      isMultiSubject: checked,
      subjectId: '',
      selectedSubjects: [],
    })
    setSelectedQuestions([])
  }

  const toggleSubject = (subjectId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedSubjects: prev.selectedSubjects.includes(subjectId)
        ? prev.selectedSubjects.filter(id => id !== subjectId)
        : [...prev.selectedSubjects, subjectId]
    }))
  }

  const removeSubject = (subjectId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedSubjects: prev.selectedSubjects.filter(id => id !== subjectId)
    }))
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
        // Efficiently merge only new IDs
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

    if (!formData.isMultiSubject && !formData.subjectId) {
      toast.error('Please select a subject')
      return
    }

    if (formData.isMultiSubject && formData.selectedSubjects.length === 0) {
      toast.error('Please select at least one subject')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          slug: formData.slug,
          subjectId: formData.isMultiSubject ? undefined : formData.subjectId,
          isMultiSubject: formData.isMultiSubject,
          durationMin: formData.durationMin,
          questionIds: selectedQuestions,
          price: formData.price,
          isFree: formData.isFree,
          instructions: formData.instructions || undefined,
          randomizeOrder: formData.randomizeOrder,
          allowReview: formData.allowReview,
          difficulty: formData.difficulty,
          ...(formData.thumbnail && formData.thumbnail !== '' && { thumbnail: formData.thumbnail })
        }),
      })

      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        throw new Error(`Server returned invalid JSON: ${text.substring(0, 100)}`)
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create exam')
      }

      toast.success('Exam created successfully!')
      router.push('/admin/exams')
    } catch (error: any) {
      console.error('Failed to create exam:', error)
      toast.error(error.message || 'Failed to create exam')
    } finally {
      setSubmitting(false)
    }
  }

  // Get unique subjects from questions for filter
  const availableSubjects = Array.from(
    new Set(allQuestions.map(q => q.subjectId))
  ).map(id => ({
    id,
    name: allQuestions.find(q => q.subjectId === id)?.subjectName || ''
  }))

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/exams')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Exams
        </Button>
        <h1 className="text-3xl font-bold">Create New Exam</h1>
        <p className="text-gray-600 mt-1">
          Set up a new exam with questions from your question bank
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Basic Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Enter the basic details of your exam
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Exam Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g., JEE Main Mock Test 1"
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
                    placeholder="e.g., jee-main-mock-test-1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-generated from title
                  </p>
                </div>

                {/* Multi-Subject Toggle */}
                <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg">
                  <Switch
                    id="multiSubject"
                    checked={formData.isMultiSubject}
                    onCheckedChange={handleMultiSubjectToggle}
                  />
                  <div className="flex-1">
                    <Label htmlFor="multiSubject" className="font-medium cursor-pointer">
                      Multi-Subject Exam
                    </Label>
                    <p className="text-xs text-gray-600">
                      Enable this to select questions from multiple subjects
                    </p>
                  </div>
                </div>

                {/* Subject Selection */}
                {!formData.isMultiSubject ? (
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
                ) : (
                  <div>
                    <Label>Subjects * (Select Multiple)</Label>
                    <div className="space-y-2">
                      {/* Selected Subjects */}
                      {formData.selectedSubjects.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.selectedSubjects.map(subjectId => {
                            const subject = subjects.find(s => s.id === subjectId)
                            return (
                              <Badge key={subjectId} variant="secondary" className="pl-3 pr-1">
                                {subject?.name}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 ml-2"
                                  onClick={() => removeSubject(subjectId)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </Badge>
                            )
                          })}
                        </div>
                      )}
                      
                      {/* Subject Selection Dropdown */}
                      <Select onValueChange={toggleSubject}>
                        <SelectTrigger>
                          <SelectValue placeholder="Add subjects..." />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects
                            .filter(s => !formData.selectedSubjects.includes(s.id))
                            .map((subject) => (
                              <SelectItem key={subject.id} value={subject.id}>
                                {subject.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
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
                  <p className="text-xs text-gray-500 mt-1">
                    Set to 0 for free exam
                  </p>
                </div>

                <div>
                  <Label htmlFor="instructions">Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={formData.instructions}
                    onChange={(e) =>
                      setFormData({ ...formData, instructions: e.target.value })
                    }
                    placeholder="Enter exam instructions..."
                    rows={4}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    {/* Used Native input instead of Checkbox to prevent loop */}
                    <input
                      type="checkbox"
                      id="randomize"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
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
                    {/* Used Native input instead of Checkbox to prevent loop */}
                    <input
                      type="checkbox"
                      id="review"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
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
                    <CardDescription>
                      Choose questions from your question bank
                    </CardDescription>
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
                {(!formData.isMultiSubject && !formData.subjectId) || 
                 (formData.isMultiSubject && formData.selectedSubjects.length === 0) ? (
                  <p className="text-center text-gray-500 py-8">
                    Please select {formData.isMultiSubject ? 'subjects' : 'a subject'} first
                  </p>
                ) : (
                  <div className="space-y-4">
                    {/* Filters */}
                    <div className="grid grid-cols-2 gap-4">
                      {formData.isMultiSubject && availableSubjects.length > 1 && (
                        <div>
                          <Label>Filter by Subject</Label>
                          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">
                                All Subjects ({allQuestions.length})
                              </SelectItem>
                              {availableSubjects.map((subject) => {
                                const count = allQuestions.filter(q => q.subjectId === subject.id).length
                                return (
                                  <SelectItem key={subject.id} value={subject.id}>
                                    {subject.name} ({count})
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div>
                        <Label>Filter by Topic</Label>
                        <Select value={topicFilter} onValueChange={setTopicFilter}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Topics ({allQuestions.length})</SelectItem>
                            {allTopics.map((topic) => {
                              const count = allQuestions.filter(q => q.topicId === topic.id).length
                              return (
                                <SelectItem key={topic.id} value={topic.id}>
                                  {topic.name} {topic.subjectName && `(${topic.subjectName})`} ({count})
                                </SelectItem>
                              )
                            })}
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
                      {loading ? (
                        <div className="flex justify-center items-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : filteredQuestions.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">
                          No questions found for selected filters
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
                                {/* CRITICAL FIX: Replaced Shadcn <Checkbox> with standard <input>
                                   This prevents the "Max update depth exceeded" error when selecting all.
                                */}
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                                  checked={selectedQuestions.includes(question.id)}
                                  onChange={() => toggleQuestion(question.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="flex-1">
                                  <p className="text-sm line-clamp-2">
                                    {question.fullStatement}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    {formData.isMultiSubject && (
                                      <>
                                        <Badge variant="outline" className="text-xs">
                                          {question.subjectName}
                                        </Badge>
                                        <span className="text-xs text-gray-400">•</span>
                                      </>
                                    )}
                                    <span className="text-xs text-gray-500">
                                      {question.topicName}
                                    </span>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-gray-500 capitalize">
                                      {question.difficulty}
                                    </span>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-gray-500">
                                      {question.marks} marks
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Selected Questions Summary */}
                    {selectedQuestions.length > 0 && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-blue-900">
                            {selectedQuestions.length} questions selected
                          </span>
                          {formData.isMultiSubject && (
                            <div className="flex gap-2">
                              {availableSubjects.map(subject => {
                                const count = selectedQuestions.filter(id => 
                                  allQuestions.find(q => q.id === id)?.subjectId === subject.id
                                ).length
                                if (count === 0) return null
                                return (
                                  <Badge key={subject.id} variant="secondary" className="text-xs">
                                    {subject.name}: {count}
                                  </Badge>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Exam ({selectedQuestions.length} questions)
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}