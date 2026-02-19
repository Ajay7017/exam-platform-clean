// src/lib/question-parser.ts
import mammoth from 'mammoth'

export interface ParsedQuestion {
  statement: string
  options: {
    key: 'A' | 'B' | 'C' | 'D'
    text: string
  }[]
  correctAnswer: 'A' | 'B' | 'C' | 'D'
  marks: number
  negativeMarks: number
  difficulty: 'easy' | 'medium' | 'hard'
  explanation?: string
}

/**
 * Parse Word document and extract questions (text only — images added later via edit)
 */
export async function parseWordDocument(
  fileBuffer: Buffer
): Promise<{ questions: ParsedQuestion[]; errors: string[] }> {
  const result = await mammoth.extractRawText({ buffer: fileBuffer })
  const text = result.value

  // Split by delimiter (---)
  const sections = text.split('---').map(s => s.trim()).filter(Boolean)

  const questions: ParsedQuestion[] = []
  const errors: string[] = []

  sections.forEach((section, sectionIndex) => {
    try {
      const question = parseQuestionSection(section)
      questions.push(question)
    } catch (error: any) {
      errors.push(`Question ${sectionIndex + 1}: ${error.message}`)
    }
  })

  return { questions, errors }
}

/**
 * Normalize difficulty values
 */
function normalizeDifficulty(value: string): 'easy' | 'medium' | 'hard' {
  const normalized = value.toLowerCase().trim()
  if (['easy', 'simple', 'basic', 'beginner'].includes(normalized)) return 'easy'
  if (['hard', 'difficult', 'advanced', 'complex', 'challenging'].includes(normalized)) return 'hard'
  return 'medium'
}

/**
 * Parse a single question section
 */
function parseQuestionSection(section: string): ParsedQuestion {
  const lines = section.split('\n').map(l => l.trim()).filter(Boolean)

  if (lines.length === 0) throw new Error('Empty question section')

  // Extract statement (everything before options A) B) C) D))
  let statement = ''
  let i = 0

  while (i < lines.length && !lines[i].match(/^[A-D]\)/)) {
    const line = lines[i]
    // Skip [IMAGE:...] tags silently — images will be added later via edit button
    if (!line.match(/^\[IMAGE:/i)) {
      statement += line + ' '
    }
    i++
  }

  statement = statement.trim()
  if (!statement) throw new Error('Question statement is empty')

  // Extract options
  const options: ParsedQuestion['options'] = []

  while (i < lines.length && lines[i].match(/^[A-D]\)/)) {
    const line = lines[i]
    const match = line.match(/^([A-D])\)\s*(.+)$/)
    if (match) {
      const key = match[1] as 'A' | 'B' | 'C' | 'D'
      // Strip any [IMAGE:...] tags from options too
      const text = match[2].replace(/\[IMAGE:[^\]]+\]/gi, '').trim()
      options.push({ key, text })
    }
    i++
  }

  if (options.length !== 4) {
    throw new Error(`Expected 4 options, found ${options.length}`)
  }

  // Extract metadata
  let correctAnswer: 'A' | 'B' | 'C' | 'D' | undefined
  let marks = 4
  let negativeMarks = 1
  let difficulty: 'easy' | 'medium' | 'hard' = 'medium'
  let explanation: string | undefined

  while (i < lines.length) {
    const line = lines[i]

    if (line.match(/^ANSWER:/i)) {
      const answer = line.replace(/^ANSWER:/i, '').trim().toUpperCase()
      if (!['A', 'B', 'C', 'D'].includes(answer)) throw new Error(`Invalid answer: ${answer}`)
      correctAnswer = answer as 'A' | 'B' | 'C' | 'D'
    } else if (line.match(/^MARKS:/i)) {
      marks = parseInt(line.replace(/^MARKS:/i, '').trim())
      if (isNaN(marks) || marks <= 0) throw new Error(`Invalid marks: ${line}`)
    } else if (line.match(/^NEGATIVE:/i)) {
      negativeMarks = parseFloat(line.replace(/^NEGATIVE:/i, '').trim())
      if (isNaN(negativeMarks) || negativeMarks < 0) throw new Error(`Invalid negative marks: ${line}`)
    } else if (line.match(/^DIFFICULTY:/i)) {
      difficulty = normalizeDifficulty(line.replace(/^DIFFICULTY:/i, '').trim())
    } else if (line.match(/^EXPLANATION:/i)) {
      explanation = line.replace(/^EXPLANATION:/i, '').trim()
      i++
      while (i < lines.length) {
        explanation += ' ' + lines[i]
        i++
      }
      break
    }

    i++
  }

  if (!correctAnswer) throw new Error('Missing ANSWER field')

  return { statement, options, correctAnswer, marks, negativeMarks, difficulty, explanation }
}

/**
 * Validate parsed questions
 */
export function validateQuestions(
  questions: ParsedQuestion[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (questions.length === 0) {
    errors.push('No questions found in document')
  }

  questions.forEach((q, index) => {
    const n = index + 1
    if (!q.statement) errors.push(`Question ${n}: Missing statement`)
    if (q.options.length !== 4) errors.push(`Question ${n}: Must have exactly 4 options`)
    const emptyOptions = q.options.filter(opt => !opt.text?.trim())
    if (emptyOptions.length > 0) errors.push(`Question ${n}: Has empty option(s)`)
    if (!q.correctAnswer) errors.push(`Question ${n}: Missing correct answer`)
    if (q.marks <= 0) errors.push(`Question ${n}: Marks must be positive`)
    if (q.negativeMarks < 0) errors.push(`Question ${n}: Negative marks cannot be negative`)
  })

  return { valid: errors.length === 0, errors }
}