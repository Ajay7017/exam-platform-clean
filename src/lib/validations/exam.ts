// src/lib/validations/exam.ts
import { z } from 'zod'

export const createExamSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters'),
  
  slug: z.string()
    .min(5, 'Slug must be at least 5 characters')
    .max(200, 'Slug must be less than 200 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  
  subjectId: z.string().cuid('Invalid subject ID').optional(),  // CHANGED: Made optional
  
  isMultiSubject: z.boolean().optional().default(false),  // NEW
  
  durationMin: z.number()
    .int('Duration must be a whole number')
    .min(15, 'Duration must be at least 15 minutes')
    .max(300, 'Duration cannot exceed 300 minutes'),
  
  questionIds: z.array(z.string().cuid())
    .min(2, 'Exam must have at least 2 questions')
    .max(200, 'Exam cannot have more than 200 questions'),
  
  price: z.number()
    .int('Price must be a whole number')
    .min(0, 'Price cannot be negative'),
  
  isFree: z.boolean().optional().default(false),
  
  instructions: z.string().optional(),
  
  randomizeOrder: z.boolean().optional().default(false),
  
  allowReview: z.boolean().optional().default(true),
  
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
  
  thumbnail: z.preprocess(
    (val) => (!val || val === '' ? undefined : val),
    z.string().url().optional()
  )
}).refine(
  (data) => {
    // If single subject mode, subjectId is required
    if (!data.isMultiSubject && !data.subjectId) {
      return false
    }
    return true
  },
  {
    message: 'Subject is required for single-subject exams',
    path: ['subjectId']
  }
)

export const updateExamSchema = createExamSchema.partial().extend({
  id: z.string().cuid()
})

export const publishExamSchema = z.object({
  isPublished: z.boolean()
})

export const examFiltersSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  subject: z.string().optional().nullable().transform(val => val || undefined),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().nullable().transform(val => val || undefined),
  search: z.string().optional().nullable().transform(val => val || undefined),
  isPublished: z.coerce.boolean().optional().nullable().transform(val => val === null ? undefined : val)
})

export type CreateExamInput = z.infer<typeof createExamSchema>
export type UpdateExamInput = z.infer<typeof updateExamSchema>
export type ExamFiltersInput = z.infer<typeof examFiltersSchema>