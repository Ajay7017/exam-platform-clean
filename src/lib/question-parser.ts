import mammoth from 'mammoth'

export interface ParsedQuestion {
  statement: string
  questionType: 'mcq' | 'numerical' // ✅ NEW
  // MCQ fields
  options: {
    key: 'A' | 'B' | 'C' | 'D'
    text: string
  }[]
  correctAnswer?: 'A' | 'B' | 'C' | 'D'
  // NAT fields ✅ NEW
  correctAnswerExact?: number
  correctAnswerMin?: number
  correctAnswerMax?: number
  // Common
  marks: number
  negativeMarks: number
  difficulty: 'easy' | 'medium' | 'hard'
  explanation?: string
}

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

  // ✅ Detect question type early by scanning all lines for TYPE: NAT
  const typeLine = lines.find(l => l.match(/^TYPE:/i))
  const isNumerical = typeLine
    ? typeLine.replace(/^TYPE:/i, '').trim().toUpperCase() === 'NAT'
    : false

  // Extract statement — everything before options (MCQ) or before metadata (NAT)
  let statement = ''
  let i = 0

  if (isNumerical) {
    // For NAT: statement is everything before TYPE:, ANSWER:, MARKS:, NEGATIVE:, DIFFICULTY:, EXPLANATION:
    while (i < lines.length && !lines[i].match(/^(TYPE|ANSWER|MARKS|NEGATIVE|DIFFICULTY|EXPLANATION):/i)) {
      const line = lines[i]
      if (!line.match(/^\[IMAGE:/i)) {
        statement += line + ' '
      }
      i++
    }
  } else {
    // For MCQ: statement is everything before A) B) C) D)
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

  // ✅ Parse MCQ options (only for MCQ)
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

  // Parse metadata
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
      // already handled above, skip
    } else if (line.match(/^ANSWER:/i)) {
      const rawAnswer = line.replace(/^ANSWER:/i, '').trim()

      if (isNumerical) {
        // ✅ NAT: check if range (e.g. "40-44") or exact (e.g. "42")
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
        // MCQ: must be A/B/C/D
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

  // ✅ Validate based on type
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