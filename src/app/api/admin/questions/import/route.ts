// src/app/api/admin/questions/import/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { parseWordDocument, validateQuestions } from '@/lib/question-parser'

// ─── Types ────────────────────────────────────────────────────────────────────

// Existing question info attached to duplicates — shown in UI
interface ExistingQuestionInfo {
  id: string
  statement: string
  topicName: string
  subjectName: string
}

// Extends the parsed preview question with duplicate detection result
export interface PreviewQuestionWithDuplicateInfo {
  statement: string
  questionType: 'mcq' | 'numerical'
  options: { key: string; text: string }[]
  correctAnswer?: string
  correctAnswerExact?: number
  correctAnswerMin?: number
  correctAnswerMax?: number
  marks: number
  negativeMarks: number
  difficulty: string
  explanation?: string
  contentHash: string | null
  // ✅ Duplicate detection fields
  isDuplicate: boolean
  existingQuestion: ExistingQuestionInfo | null
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const adminId = session.user.id

    const formData = await request.formData()

    const wordFile = formData.get('wordFile') as File | null
    const subjectId = formData.get('subjectId') as string
    const topicId = formData.get('topicId') as string
    const subTopicId = formData.get('subTopicId') as string | null

    if (!wordFile || !subjectId || !topicId) {
      return NextResponse.json(
        { error: 'Missing required fields: wordFile, subjectId, topicId' },
        { status: 400 }
      )
    }

    if (!wordFile.name.endsWith('.docx')) {
      return NextResponse.json(
        { error: 'Only .docx files are supported' },
        { status: 400 }
      )
    }

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { name: true }
    })

    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      select: { name: true }
    })

    if (!subject || !topic) {
      return NextResponse.json(
        { error: 'Invalid subject or topic ID' },
        { status: 400 }
      )
    }

    let subTopicName: string | undefined
    if (subTopicId) {
      const subTopic = await prisma.subTopic.findUnique({
        where: { id: subTopicId },
        select: { name: true }
      })
      if (!subTopic) {
        return NextResponse.json(
          { error: 'Invalid subtopic ID' },
          { status: 400 }
        )
      }
      subTopicName = subTopic.name
    }

    const wordBytes = await wordFile.arrayBuffer()
    const wordBuffer = Buffer.from(wordBytes)
    const { questions, errors: parseErrors } = await parseWordDocument(wordBuffer)

    const { valid, errors: validationErrors } = validateQuestions(questions)
    const allErrors = [...parseErrors, ...validationErrors]
    const canProceed = questions.length > 0 && valid

    // ✅ DUPLICATE DETECTION — single batch DB call for all questions
    // Collect all non-null hashes from parsed questions
    const hashesToCheck = questions
      .map(q => q.contentHash)
      .filter((h): h is string => h !== null)

    // One DB query for the entire batch — not one per question
    // Only fetch what we need for the UI: id, statement, topic+subject names
    const existingQuestions = hashesToCheck.length > 0
      ? await prisma.question.findMany({
          where: {
            contentHash: { in: hashesToCheck },
            isActive: true,
          },
          select: {
            id: true,
            statement: true,
            contentHash: true,
            topic: {
              select: {
                name: true,
                subject: { select: { name: true } }
              }
            }
          }
        })
      : []

    // Build a lookup map: hash → existing question info
    // O(1) lookup per question instead of scanning array each time
    const existingHashMap = new Map<string, ExistingQuestionInfo>()
    for (const eq of existingQuestions) {
      if (eq.contentHash) {
        existingHashMap.set(eq.contentHash, {
          id: eq.id,
          // Truncate long statements for display in UI
          statement: eq.statement.length > 200
            ? eq.statement.slice(0, 200) + '...'
            : eq.statement,
          topicName: eq.topic.name,
          subjectName: eq.topic.subject.name,
        })
      }
    }

    // Tag each parsed question with duplicate info
    const questionsWithDuplicateInfo: PreviewQuestionWithDuplicateInfo[] = questions.map(q => {
      const existingMatch = q.contentHash
        ? existingHashMap.get(q.contentHash) ?? null
        : null

      return {
        statement: q.statement,
        questionType: q.questionType,
        options: q.options,
        correctAnswer: q.correctAnswer,
        correctAnswerExact: q.correctAnswerExact,
        correctAnswerMin: q.correctAnswerMin,
        correctAnswerMax: q.correctAnswerMax,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        difficulty: q.difficulty,
        explanation: q.explanation,
        contentHash: q.contentHash,
        isDuplicate: existingMatch !== null,
        existingQuestion: existingMatch,
      }
    })

    // Split counts for summary
    const mcqCount = questions.filter(q => q.questionType === 'mcq').length
    const numericalCount = questions.filter(q => q.questionType === 'numerical').length
    const duplicatesFound = questionsWithDuplicateInfo.filter(q => q.isDuplicate).length
    const newQuestions = questionsWithDuplicateInfo.filter(q => !q.isDuplicate).length

    // Store full tagged data in previewData so confirm route can read isDuplicate flags
    const job = await prisma.importJob.create({
      data: {
        adminId,
        fileName: wordFile.name,
        subjectId,
        topicId,
        totalQuestions: questions.length,
        status: 'pending',
        previewData: questionsWithDuplicateInfo as any,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
      }
    })

    return NextResponse.json({
      success: true,
      importJobId: job.id,
      // First 10 of ALL questions for preview display (UI will split by isDuplicate)
      preview: questionsWithDuplicateInfo.slice(0, 10),
      // Full list needed by frontend to build tabs
      allQuestions: questionsWithDuplicateInfo,
      summary: {
        totalQuestions: questions.length,
        mcqCount,
        numericalCount,
        duplicatesFound,   // ✅ NEW
        newQuestions,      // ✅ NEW
        subjectName: subject.name,
        topicName: topic.name,
        subTopicName: subTopicName || null,
      },
      errors: allErrors,
      canProceed,
      subTopicId: subTopicId || null,
    })

  } catch (error) {
    console.error('IMPORT ERROR:', error)
    return handleApiError(error)
  }
}