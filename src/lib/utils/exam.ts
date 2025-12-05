// src/lib/utils/exam.ts

/**
 * Generate a URL-friendly slug from a title
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

/**
 * Format price from paise to rupees
 */
export function formatPrice(paise: number): string {
  if (paise === 0) return 'Free'
  const rupees = paise / 100
  return `₹${rupees.toLocaleString('en-IN')}`
}

/**
 * Format duration in minutes to readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (mins === 0) {
    return `${hours} hr`
  }
  
  return `${hours} hr ${mins} min`
}

/**
 * Calculate exam statistics
 */
export function calculateExamStats(questions: Array<{ marks: number; negativeMarks: number; difficulty: string }>) {
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0)
  const totalNegativeMarks = questions.reduce((sum, q) => sum + q.negativeMarks, 0)
  
  const difficultyCount = questions.reduce((acc, q) => {
    acc[q.difficulty] = (acc[q.difficulty] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return {
    totalQuestions: questions.length,
    totalMarks,
    totalNegativeMarks,
    easyCount: difficultyCount.easy || 0,
    mediumCount: difficultyCount.medium || 0,
    hardCount: difficultyCount.hard || 0
  }
}

/**
 * Validate exam creation/update data
 */
export function validateExamData(data: {
  title: string
  questionIds: string[]
  durationMin: number
  price: number
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (data.title.length < 5) {
    errors.push('Title must be at least 5 characters')
  }
  
  if (data.questionIds.length < 10) {
    errors.push('Exam must have at least 10 questions')
  }
  
  if (data.durationMin < 15) {
    errors.push('Duration must be at least 15 minutes')
  }
  
  if (data.durationMin > 300) {
    errors.push('Duration cannot exceed 300 minutes (5 hours)')
  }
  
  if (data.price < 0) {
    errors.push('Price cannot be negative')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Shuffle array (for randomizing question order)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Get difficulty badge color
 */
export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'easy':
      return 'bg-green-100 text-green-800'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800'
    case 'hard':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

/**
 * Format exam card data for frontend
 */
export interface ExamCard {
  id: string
  title: string
  slug: string
  thumbnail: string
  subject: string
  subjectSlug: string
  duration: number
  totalQuestions: number
  totalMarks: number
  difficulty: string
  price: number
  isFree: boolean
  isPurchased: boolean
  topics: string[]
  totalAttempts: number
}

export function formatExamCard(exam: any, isPurchased: boolean): ExamCard {
  return {
    id: exam.id,
    title: exam.title,
    slug: exam.slug,
    thumbnail: exam.thumbnail || '/default-exam-thumbnail.jpg',
    subject: exam.subject.name,
    subjectSlug: exam.subject.slug,
    duration: exam.durationMin,
    totalQuestions: exam._count?.questions || exam.questions?.length || 0,
    totalMarks: exam.totalMarks,
    difficulty: exam.difficulty,
    price: exam.price,
    isFree: exam.isFree,
    isPurchased,
    topics: exam.topics || [],
    totalAttempts: exam._count?.attempts || 0
  }
}