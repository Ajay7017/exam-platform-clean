import * as z from 'zod'

export const createExamEventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  slug: z.string().min(3, 'Slug must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens'),
  description: z.preprocess(
    val => (val === '' || val === null || val === undefined ? undefined : val),
    z.string().optional()
  ),
  examDate: z.preprocess(
    val => (val === '' || val === null || val === undefined ? undefined : val),
    z.string().datetime().optional()
  ),

  // Score calculator
  calculatorEnabled: z.boolean().default(false),
  totalQuestions: z.number().int().min(1).default(180),
  totalMarks: z.number().int().min(1).default(720),
  correctMarks: z.number().min(0).default(4),
  negativeMarks: z.number().min(0).default(1),

  // Cutoffs
  cutoffGeneral: z.preprocess(
    val => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().optional()
  ),
  cutoffOBC: z.preprocess(
    val => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().optional()
  ),
  cutoffSC: z.preprocess(
    val => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().optional()
  ),
  cutoffST: z.preprocess(
    val => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().optional()
  ),

  // SEO
  metaTitle: z.preprocess(
    val => (val === '' || val === null || val === undefined ? undefined : val),
    z.string().optional()
  ),
  metaDescription: z.preprocess(
    val => (val === '' || val === null || val === undefined ? undefined : val),
    z.string().optional()
  ),

  // Popup
  popupEnabled: z.boolean().default(false),
  popupMessage: z.preprocess(
    val => (val === '' || val === null || val === undefined ? undefined : val),
    z.string().optional()
  ),
  popupLinkLabel: z.preprocess(
    val => (val === '' || val === null || val === undefined ? undefined : val),
    z.string().optional()
  ),
})

export const updateExamEventSchema = createExamEventSchema.partial()

export const createExamEventResourceSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  type: z.enum(['QUESTION_PAPER', 'ANSWER_KEY', 'SOLUTIONS', 'OTHER']),
  driveLink: z.preprocess(
    val => (val === '' || val === null || val === undefined ? undefined : val),
    z.string().url('Must be a valid URL').optional()
  ),
  fileUrl: z.preprocess(
    val => (val === '' || val === null || val === undefined ? undefined : val),
    z.string().url('Must be a valid URL').optional()
  ),
  status: z.enum(['COMING_SOON', 'LIVE', 'REMOVED']).default('COMING_SOON'),
  sortOrder: z.number().int().default(0),
})

export const updateExamEventResourceSchema = createExamEventResourceSchema.partial()

export type CreateExamEventInput = z.infer<typeof createExamEventSchema>
export type UpdateExamEventInput = z.infer<typeof updateExamEventSchema>
export type CreateExamEventResourceInput = z.infer<typeof createExamEventResourceSchema>
export type UpdateExamEventResourceInput = z.infer<typeof updateExamEventResourceSchema>

export const answerKeySectionSchema = z.object({
  name: z.string().min(1, 'Section name is required'),
  from: z.number().int().min(1),
  to: z.number().int().min(1),
})

export const answerKeyQuestionSchema = z.object({
  number: z.number().int().min(1),
  answer: z.string().min(1),
  explanation: z.string().optional().default(''),
})

export const answerKeySchema = z.object({
  sections: z.array(answerKeySectionSchema).min(1, 'At least one section is required'),
  questions: z.array(answerKeyQuestionSchema).min(1, 'At least one question is required'),
})

export type AnswerKeyInput = z.infer<typeof answerKeySchema>