import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { parseWordDocument, validateQuestions } from '@/lib/question-parser'

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

    // ✅ Include questionType in summary breakdown
    const mcqCount = questions.filter(q => q.questionType === 'mcq').length
    const numericalCount = questions.filter(q => q.questionType === 'numerical').length

    const job = await prisma.importJob.create({
      data: {
        adminId,
        fileName: wordFile.name,
        subjectId,
        topicId,
        totalQuestions: questions.length,
        status: 'pending',
        previewData: questions as any,
        successCount: 0,
        failedCount: 0,
      }
    })

    return NextResponse.json({
      success: true,
      importJobId: job.id,
      preview: questions.slice(0, 10),
      summary: {
        totalQuestions: questions.length,
        mcqCount,           // ✅ NEW
        numericalCount,     // ✅ NEW
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