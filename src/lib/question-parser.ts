import mammoth from 'mammoth'
import { createHash } from 'crypto' // ✅ Node built-in — zero new dependency

export interface ParsedQuestion {
  statement: string
  questionType: 'mcq' | 'numerical'
  // MCQ fields
  options: {
    key: 'A' | 'B' | 'C' | 'D'
    text: string
  }[]
  correctAnswer?: 'A' | 'B' | 'C' | 'D'
  // NAT fields
  correctAnswerExact?: number
  correctAnswerMin?: number
  correctAnswerMax?: number
  // Common
  marks: number
  negativeMarks: number
  difficulty: 'easy' | 'medium' | 'hard'
  explanation?: string
  // ✅ NEW: hash computed at parse time, stored alongside question
  contentHash: string | null
}

// ============================================================
// ✅ NEW: HASH UTILITY — used by parser, API routes, and form
// ============================================================

/**
 * Strips HTML tags, lowercases, and collapses whitespace.
 * Used to normalize text before hashing so minor formatting
 * differences don't produce different hashes.
 */
export function normalizeText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')   // strip HTML tags
    .toLowerCase()
    .replace(/\s+/g, ' ')      // collapse all whitespace
    .trim()
}

/**
 * Returns true if the text is image-only content (no meaningful text).
 * When true, we skip the duplicate check entirely — we cannot
 * hash images reliably at form-entry time.
 */
export function isImageOnlyContent(html: string): boolean {
  if (!html) return false
  const hasImage = /<img\s/i.test(html)
  if (!hasImage) return false
  const textOnly = html.replace(/<[^>]*>/g, '').trim()
  return textOnly.length === 0
}

/**
 * Computes a SHA256 hash for a question based on its type.
 *
 * Hash inputs by type:
 * - MCQ:     statement + optionA + optionB + optionC + optionD
 * - NAT exact:  statement + exactAnswer
 * - NAT range:  statement + min + max
 * - Match:   statement + optionA + optionB + optionC + optionD + matchPairs JSON
 *
 * Returns null when:
 * - Any required field is missing
 * - Options are image-only (cannot hash images)
 *
 * Returning null means "skip duplicate check" — the question
 * will be inserted without a hash, and won't block on duplicate detection.
 */
export function computeQuestionHash(params: {
  questionType: 'mcq' | 'numerical' | 'match'
  statement: string
  // MCQ / Match options (HTML strings from rich text editor)
  optionA?: string | null
  optionB?: string | null
  optionC?: string | null
  optionD?: string | null
  // NAT fields
  correctAnswerExact?: number | null
  correctAnswerMin?: number | null
  correctAnswerMax?: number | null
  // Match
  matchPairs?: any | null
}): string | null {
  const { questionType, statement } = params

  const normalizedStatement = normalizeText(statement)
  if (!normalizedStatement) return null

  if (questionType === 'mcq') {
    const { optionA, optionB, optionC, optionD } = params

    // If any option is image-only, skip hash — can't compare images
    if (
      isImageOnlyContent(optionA || '') ||
      isImageOnlyContent(optionB || '') ||
      isImageOnlyContent(optionC || '') ||
      isImageOnlyContent(optionD || '')
    ) return null

    const nA = normalizeText(optionA || '')
    const nB = normalizeText(optionB || '')
    const nC = normalizeText(optionC || '')
    const nD = normalizeText(optionD || '')

    // All 4 options must have content to hash meaningfully
    if (!nA || !nB || !nC || !nD) return null

    const input = `mcq|${normalizedStatement}|${nA}|${nB}|${nC}|${nD}`
    return createHash('sha256').update(input).digest('hex')
  }

  if (questionType === 'numerical') {
    const { correctAnswerExact, correctAnswerMin, correctAnswerMax } = params

    const hasExact = correctAnswerExact !== null && correctAnswerExact !== undefined
    const hasRange = correctAnswerMin !== null && correctAnswerMin !== undefined
                  && correctAnswerMax !== null && correctAnswerMax !== undefined

    if (hasExact) {
      const input = `nat|${normalizedStatement}|exact|${correctAnswerExact}`
      return createHash('sha256').update(input).digest('hex')
    }

    if (hasRange) {
      const input = `nat|${normalizedStatement}|range|${correctAnswerMin}|${correctAnswerMax}`
      return createHash('sha256').update(input).digest('hex')
    }

    return null // NAT with no answer — skip hash
  }

  if (questionType === 'match') {
    const { optionA, optionB, optionC, optionD, matchPairs } = params

    if (
      isImageOnlyContent(optionA || '') ||
      isImageOnlyContent(optionB || '') ||
      isImageOnlyContent(optionC || '') ||
      isImageOnlyContent(optionD || '')
    ) return null

    const nA = normalizeText(optionA || '')
    const nB = normalizeText(optionB || '')
    const nC = normalizeText(optionC || '')
    const nD = normalizeText(optionD || '')

    if (!nA || !nB || !nC || !nD) return null

    // Normalize matchPairs: stringify for stable hashing
    const pairsString = matchPairs
      ? normalizeText(JSON.stringify(matchPairs))
      : ''

    const input = `match|${normalizedStatement}|${nA}|${nB}|${nC}|${nD}|${pairsString}`
    return createHash('sha256').update(input).digest('hex')
  }

  return null
}

// ============================================================
// EXISTING PARSER CODE — unchanged except ParsedQuestion now
// includes contentHash field computed at parse time
// ============================================================

export async function parseWordDocument(
  fileBuffer: Buffer
): Promise<{ questions: ParsedQuestion[]; errors: string[] }> {
  const result = await mammoth.extractRawText({ buffer: fileBuffer })
  const text = result.value

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

function normalizeDifficulty(value: string): 'easy' | 'medium' | 'hard' {
  const normalized = value.toLowerCase().trim()
  if (['easy', 'simple', 'basic', 'beginner'].includes(normalized)) return 'easy'
  if (['hard', 'difficult', 'advanced', 'complex', 'challenging'].includes(normalized)) return 'hard'
  return 'medium'
}

function parseQuestionSection(section: string): ParsedQuestion {
  const lines = section.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) throw new Error('Empty question section')

  const typeLine = lines.find(l => l.match(/^TYPE:/i))
  const isNumerical = typeLine
    ? typeLine.replace(/^TYPE:/i, '').trim().toUpperCase() === 'NAT'
    : false

  let statement = ''
  let i = 0

  if (isNumerical) {
    while (i < lines.length && !lines[i].match(/^(TYPE|ANSWER|MARKS|NEGATIVE|DIFFICULTY|EXPLANATION):/i)) {
      const line = lines[i]
      if (!line.match(/^\[IMAGE:/i)) {
        statement += line + ' '
      }
      i++
    }
  } else {
    while (i < lines.length && !lines[i].match(/^[A-D]\)/)) {
      const line = lines[i]
      if (!line.match(/^\[IMAGE:/i)) {
        statement += line + ' '
      }
      i++
    }
  }

  statement = statement.trim()
  if (!statement) throw new Error('Question statement is empty')

  const options: ParsedQuestion['options'] = []

  if (!isNumerical) {
    while (i < lines.length && lines[i].match(/^[A-D]\)/)) {
      const line = lines[i]
      const match = line.match(/^([A-D])\)\s*(.+)$/)
      if (match) {
        const key = match[1] as 'A' | 'B' | 'C' | 'D'
        const text = match[2].replace(/\[IMAGE:[^\]]+\]/gi, '').trim()
        options.push({ key, text })
      }
      i++
    }

    if (options.length !== 4) {
      throw new Error(`Expected 4 options, found ${options.length}`)
    }
  }

  let correctAnswer: 'A' | 'B' | 'C' | 'D' | undefined
  let correctAnswerExact: number | undefined
  let correctAnswerMin: number | undefined
  let correctAnswerMax: number | undefined
  let marks = 4
  let negativeMarks = 1
  let difficulty: 'easy' | 'medium' | 'hard' = 'medium'
  let explanation: string | undefined

  while (i < lines.length) {
    const line = lines[i]

    if (line.match(/^TYPE:/i)) {
      // already handled above
    } else if (line.match(/^ANSWER:/i)) {
      const rawAnswer = line.replace(/^ANSWER:/i, '').trim()

      if (isNumerical) {
        const rangeMatch = rawAnswer.match(/^(-?\d+\.?\d*)\s*-\s*(-?\d+\.?\d*)$/)
        if (rangeMatch) {
          correctAnswerMin = parseFloat(rangeMatch[1])
          correctAnswerMax = parseFloat(rangeMatch[2])
          if (correctAnswerMin >= correctAnswerMax) {
            throw new Error(`Invalid range: min must be less than max. Got ${rawAnswer}`)
          }
        } else {
          const exact = parseFloat(rawAnswer)
          if (isNaN(exact)) throw new Error(`Invalid numerical answer: ${rawAnswer}`)
          correctAnswerExact = exact
        }
      } else {
        const answer = rawAnswer.toUpperCase()
        if (!['A', 'B', 'C', 'D'].includes(answer)) throw new Error(`Invalid answer: ${answer}`)
        correctAnswer = answer as 'A' | 'B' | 'C' | 'D'
      }
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

  // ✅ Compute hash at parse time for MCQ
  // For imported questions, options are plain text (not HTML), so we
  // pass them directly — normalizeText handles plain text fine too
  let contentHash: string | null = null

  if (isNumerical) {
    contentHash = computeQuestionHash({
      questionType: 'numerical',
      statement,
      correctAnswerExact,
      correctAnswerMin,
      correctAnswerMax,
    })
  } else {
    const optMap = Object.fromEntries(options.map(o => [o.key, o.text]))
    contentHash = computeQuestionHash({
      questionType: 'mcq',
      statement,
      optionA: optMap['A'] || '',
      optionB: optMap['B'] || '',
      optionC: optMap['C'] || '',
      optionD: optMap['D'] || '',
    })
  }

  if (isNumerical) {
    const hasExact = correctAnswerExact !== undefined
    const hasRange = correctAnswerMin !== undefined && correctAnswerMax !== undefined
    if (!hasExact && !hasRange) {
      throw new Error('NAT question missing ANSWER field (exact number or range like 40-44)')
    }
    return {
      statement,
      questionType: 'numerical',
      options: [],
      correctAnswerExact,
      correctAnswerMin,
      correctAnswerMax,
      marks,
      negativeMarks,
      difficulty,
      explanation,
      contentHash, // ✅
    }
  } else {
    if (!correctAnswer) throw new Error('Missing ANSWER field')
    return {
      statement,
      questionType: 'mcq',
      options,
      correctAnswer,
      marks,
      negativeMarks,
      difficulty,
      explanation,
      contentHash, // ✅
    }
  }
}

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
    if (q.marks <= 0) errors.push(`Question ${n}: Marks must be positive`)
    if (q.negativeMarks < 0) errors.push(`Question ${n}: Negative marks cannot be negative`)

    if (q.questionType === 'mcq') {
      if (q.options.length !== 4) errors.push(`Question ${n}: Must have exactly 4 options`)
      const emptyOptions = q.options.filter(opt => !opt.text?.trim())
      if (emptyOptions.length > 0) errors.push(`Question ${n}: Has empty option(s)`)
      if (!q.correctAnswer) errors.push(`Question ${n}: Missing correct answer`)
    } else if (q.questionType === 'numerical') {
      const hasExact = q.correctAnswerExact !== undefined
      const hasRange = q.correctAnswerMin !== undefined && q.correctAnswerMax !== undefined
      if (!hasExact && !hasRange) {
        errors.push(`Question ${n}: NAT question must have an exact answer or a range`)
      }
    }
  })

  return { valid: errors.length === 0, errors }
}