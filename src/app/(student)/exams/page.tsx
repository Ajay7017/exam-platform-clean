// src/app/(student)/exams/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Search, Loader2 } from 'lucide-react'
import { ExamFilters } from '@/components/student/ExamFilters'
import { ExamCard } from '@/components/student/ExamCard'
import { toast } from 'sonner'

interface Exam {
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
  topics: string[]
  totalAttempts: number
}

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    subject: '',
    difficulty: '',
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  // Fetch exams from API
  useEffect(() => {
    fetchExams()
  }, [filters, pagination.page, searchQuery])

  const fetchExams = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      
      if (filters.subject) params.append('subject', filters.subject)
      if (filters.difficulty) params.append('difficulty', filters.difficulty)
      if (searchQuery) params.append('search', searchQuery)
      
      const res = await fetch(`/api/exams?${params}`)
      
      if (!res.ok) {
        throw new Error('Failed to fetch exams')
      }
      
      const data = await res.json()
      
      setExams(data.exams)
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      }))
    } catch (error: any) {
      console.error('Failed to fetch exams:', error)
      toast.error('Failed to load exams')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Browse Exams</h1>
        <p className="text-muted-foreground mt-2">
          Choose from {pagination.total} available exams across multiple subjects
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
        <Input
          placeholder="Search exams by name or subject..."
          className="pl-10 h-12"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <ExamFilters 
            filters={filters}
            onFilterChange={setFilters}
          />
        </div>

        {/* Exams Grid */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : exams.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">
                No exams found matching your criteria
              </p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-6">
                {exams.map((exam) => (
                  <ExamCard key={exam.id} exam={exam} />
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-8 flex justify-center">
                <p className="text-sm text-muted-foreground">
                  Showing {exams.length} of {pagination.total} exams
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}