// src/app/api/admin/questions/import/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { parseWordDocument, parseCSVMapping, validateQuestions } from '@/lib/question-parser'

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate and get Admin ID
    const session = await requireAdmin()
    const adminId = session.user.id

    // 2. Parse FormData
    const formData = await request.formData()
    console.log('IMPORT API RECEIVED KEYS:', Array.from(formData.keys()))

    const wordFile = formData.get('wordFile') as File | null
    const csvFile = formData.get('csvFile') as File | null
    const subjectId = formData.get('subjectId') as string
    const topicId = formData.get('topicId') as string

    if (!wordFile || !csvFile || !subjectId || !topicId) {
      return NextResponse.json(
        { error: 'Missing required fields (wordFile, csvFile, subjectId, or topicId)' },
        { status: 400 }
      )
    }

    if (!wordFile.name.endsWith('.docx')) {
      return NextResponse.json(
        { error: 'Only .docx files are supported' },
        { status: 400 }
      )
    }

    if (!csvFile.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only .csv files are supported for image mapping' },
        { status: 400 }
      )
    }

    // 3. Get Subject and Topic names for summary
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

    // 4. Parse CSV file for image mapping
    const csvBytes = await csvFile.arrayBuffer()
    const csvText = new TextDecoder().decode(csvBytes)
    const imageMapping = parseCSVMapping(csvText)

    // 5. Parse Word document
    const wordBytes = await wordFile.arrayBuffer()
    const wordBuffer = Buffer.from(wordBytes)
    
    const { questions, errors: parseErrors } = await parseWordDocument(
      wordBuffer,
      imageMapping
    )

    // 6. Validate questions
    const { valid, errors: validationErrors } = validateQuestions(questions)
    
    const allErrors = [...parseErrors, ...validationErrors]
    const canProceed = questions.length > 0 && valid

    // 7. Create ImportJob in DB with all questions data
    const job = await prisma.importJob.create({
      data: {
        adminId,
        fileName: wordFile.name,
        subjectId,
        topicId,
        totalQuestions: questions.length,
        status: 'pending',
        previewData: questions as any, // Store all questions for import
        successCount: 0,
        failedCount: 0,
      }
    })

    return NextResponse.json({
      success: true,
      importJobId: job.id,
      preview: questions.slice(0, 10), // Send first 10 for preview
      summary: {
        totalQuestions: questions.length,
        subjectName: subject.name,
        topicName: topic.name,
      },
      errors: allErrors,
      canProceed,
      message: canProceed 
        ? `Successfully parsed ${questions.length} questions` 
        : 'Document has errors. Please fix and try again.'
    })

  } catch (error) {
    console.error('IMPORT ERROR:', error)
    return handleApiError(error)
  }
}