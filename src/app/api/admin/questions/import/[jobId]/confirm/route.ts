// src/app/api/admin/questions/import/[jobId]/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    await requireAdmin()

    const { jobId } = await context.params

    let subTopicId: string | null = null
    try {
      const body = await request.json()
      subTopicId = body.subTopicId || null
    } catch {
      // no body is fine
    }

    const job = await prisma.importJob.findUnique({ where: { id: jobId } })

    if (!job) {
      return NextResponse.json({ error: 'Import job not found' }, { status: 404 })
    }

    if (job.status !== 'pending') {
      return NextResponse.json(
        { error: `Import job is not in pending state (current: ${job.status})` },
        { status: 400 }
      )
    }

    await prisma.importJob.update({
      where: { id: jobId },
      data: { status: 'processing', successCount: 0, failedCount: 0 }
    })

    processImportInBackground(jobId, subTopicId).catch(err => {
      console.error('Background process error:', err)
    })

    return NextResponse.json({ success: true, message: 'Import started successfully' })

  } catch (error) {
    console.error('CONFIRM IMPORT ERROR:', error)
    return handleApiError(error)
  }
}

async function processImportInBackground(jobId: string, subTopicId: string | null) {
  console.log(`[${jobId}] Starting background import, subTopicId: ${subTopicId}`)

  try {
    const job = await prisma.importJob.findUnique({ where: { id: jobId } })

    if (!job || !job.previewData) throw new Error('Job or preview data not found')

    const questions = job.previewData as any[]
    let successCount = 0
    let failedCount = 0
    const errors: string[] = []

    for (let i = 0; i < questions.length; i++) {
      try {
        const q = questions[i]

        // ✅ Determine question type — default to 'mcq' for backward compatibility
        const isNumerical = q.questionType === 'numerical'

        await prisma.question.create({
          data: {
            statement: q.statement,
            imageUrl: null,
            topicId: job.topicId,
            subTopicId: subTopicId || null,
            marks: q.marks,
            negativeMarks: q.negativeMarks,
            difficulty: q.difficulty,
            explanation: q.explanation || null,
            isActive: true,
            version: 1,

            // ✅ NEW: set type field
            type: isNumerical ? 'numerical' : 'mcq',

            // ✅ NEW: NAT answer fields — only set for numerical, null for MCQ
            correctAnswerExact: isNumerical ? (q.correctAnswerExact ?? null) : null,
            correctAnswerMin: isNumerical ? (q.correctAnswerMin ?? null) : null,
            correctAnswerMax: isNumerical ? (q.correctAnswerMax ?? null) : null,

            // ✅ Options — only created for MCQ, skipped for NAT
            ...(!isNumerical && {
              options: {
                create: q.options.map((opt: any, idx: number) => ({
                  text: opt.text,
                  imageUrl: null,
                  isCorrect: opt.key === q.correctAnswer,
                  optionKey: opt.key,
                  sequence: idx + 1,
                }))
              }
            })
          }
        })

        successCount++

        // Update progress every 5 questions
        if (i % 5 === 0 || i === questions.length - 1) {
          await prisma.importJob.update({
            where: { id: jobId },
            data: { successCount, failedCount }
          })
        }

      } catch (error: any) {
        failedCount++
        errors.push(`Question ${i + 1}: ${error.message}`)
        console.error(`[${jobId}] Question ${i + 1} failed:`, error.message)
      }
    }

    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        successCount,
        failedCount,
        errors: errors.length > 0 ? errors : null,
        completedAt: new Date(),
      }
    })

    console.log(`[${jobId}] Done: ${successCount} success, ${failedCount} failed`)

  } catch (error) {
    console.error(`[${jobId}] Fatal error:`, error)
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        completedAt: new Date(),
      }
    }).catch(() => {})
  }
}