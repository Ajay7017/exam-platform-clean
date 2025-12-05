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

    // 1. Get the import job
    const job = await prisma.importJob.findUnique({
      where: { id: jobId }
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Import job not found' },
        { status: 404 }
      )
    }

    if (job.status !== 'pending') {
      return NextResponse.json(
        { error: `Import job is not in pending state (current: ${job.status})` },
        { status: 400 }
      )
    }

    // 2. Update job status to processing
    await prisma.importJob.update({
      where: { id: jobId },
      data: { 
        status: 'processing',
        successCount: 0,
        failedCount: 0
      }
    })

    // 3. Start processing in background (non-blocking)
    console.log(`Starting background import for job ${jobId}`)
    processImportInBackground(jobId).catch(err => {
      console.error('Background process error:', err)
    })

    return NextResponse.json({
      success: true,
      message: 'Import started successfully'
    })

  } catch (error) {
    console.error('CONFIRM IMPORT ERROR:', error)
    return handleApiError(error)
  }
}

/**
 * Process import in background without blocking the response
 */
async function processImportInBackground(jobId: string) {
  console.log(`[${jobId}] Starting background import process`)
  
  try {
    const job = await prisma.importJob.findUnique({
      where: { id: jobId }
    })

    if (!job || !job.previewData) {
      throw new Error('Job or preview data not found')
    }

    const questions = job.previewData as any[]
    console.log(`[${jobId}] Processing ${questions.length} questions`)
    
    let successCount = 0
    let failedCount = 0
    const errors: string[] = []

    // Process questions one by one
    for (let i = 0; i < questions.length; i++) {
      try {
        const q = questions[i]
        
        console.log(`[${jobId}] Importing question ${i + 1}/${questions.length}`)

        // Create question with options
        await prisma.question.create({
          data: {
            statement: q.statement,
            imageUrl: q.statementImage || null,
            topicId: job.topicId,
            marks: q.marks,
            negativeMarks: q.negativeMarks,
            difficulty: q.difficulty,
            explanation: q.explanation || null,
            isActive: true,
            version: 1,
            // Create options as nested records
            options: {
              create: q.options.map((opt: any, idx: number) => ({
                text: opt.text,
                imageUrl: opt.imageUrl || null,
                isCorrect: opt.key === q.correctAnswer,
                optionKey: opt.key,
                sequence: idx,
              }))
            }
          }
        })

        successCount++

        // Update progress every 5 questions (or last question)
        if (i % 5 === 0 || i === questions.length - 1) {
          await prisma.importJob.update({
            where: { id: jobId },
            data: {
              successCount,
              failedCount,
            }
          })
          console.log(`[${jobId}] Progress: ${successCount} success, ${failedCount} failed`)
        }

      } catch (error: any) {
        failedCount++
        const errorMsg = `Question ${i + 1}: ${error.message}`
        errors.push(errorMsg)
        console.error(`[${jobId}] ${errorMsg}`)
      }
    }

    // Mark job as completed
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

    console.log(`[${jobId}] Import completed: ${successCount} success, ${failedCount} failed`)

  } catch (error) {
    console.error(`[${jobId}] Background import error:`, error)
    
    // Mark job as failed
    try {
      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          completedAt: new Date(),
        }
      })
    } catch (updateError) {
      console.error(`[${jobId}] Failed to update job status:`, updateError)
    }
  }
}