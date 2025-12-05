// src/lib/validations.ts
import { z } from 'zod'

// ============================================
// SUBJECT VALIDATIONS
// ============================================
export const createSubjectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  slug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  description: z.string().optional(),
  isActive: z.boolean().optional().default(true),
})

export const updateSubjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

// ============================================
// TOPIC VALIDATIONS
// ============================================
export const createTopicSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  slug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  subjectId: z.string().cuid('Invalid subject ID'),
  sequence: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
})

export const updateTopicSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/).optional(),
  subjectId: z.string().cuid().optional(),
  sequence: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

// ============================================
// HELPER: Auto-generate slug from name
// ============================================
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single
}