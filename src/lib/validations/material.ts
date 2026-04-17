// src/lib/validations/material.ts
import * as z from 'zod'

export const createMaterialSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  subject: z.string().min(2, 'Subject is required'),
  type: z.string().min(2, 'Type is required (e.g., PDF, Video)'),
  link: z.string().url('Must be a valid URL'),
  thumbnailUrl: z.string().url('Must be a valid URL').optional().nullable(),
  isPublished: z.boolean().default(false)
})

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>