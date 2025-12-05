// src/lib/ queue.ts
import { Queue, Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { prisma } from './prisma'
import type { ParsedQuestion } from './question-parser'

// Redis connection
const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
})

// Question import queue
export const questionImportQueue = new Queue('question-import', {
  connection,
})

interface ImportJobData {
  importJobId: string
  topicId: string
  questions: ParsedQuestion[]
}

/**
 * Add question import job to queue
 */
export async function queueQuestionImport(
  importJobId: string,
  topicId: string,
  questions: ParsedQuestion[]
) {
  await questionImportQueue.add('import-questions', {
    importJobId,
    topicId,
    questions,
  })
}

/**
 * Process question import jobs
 */
export function startQuestionImportWorker() {
  const worker = new Worker<ImportJobData>(
    'question-import',
    async (job: Job<ImportJobData>) => {
      const { importJobId, topicId, questions } = job.data

      console.log(`Processing import job: ${importJobId}`)

      // Update job status to processing
      await prisma.importJob.update({
        where: { id: importJobId },
        data: { status: 'processing' },
      })

      let successCount = 0
      let failedCount = 0
      const errors: string[] = []

      try {
        // Import questions one by one
        for (let i = 0; i < questions.length; i++) {
          const question = questions[i]

          try {
            await prisma.question.create({
              data: {
                statement: question.statement,
                imageUrl: question.statementImage,
                topicId,
                marks: question.marks,
                negativeMarks: question.negativeMarks,
                difficulty: question.difficulty,
                explanation: question.explanation,
                isActive: true,
                options: {
                  create: question.options.map((opt, idx) => ({
                    text: opt.text,
                    imageUrl: opt.imageUrl,
                    optionKey: opt.key,
                    isCorrect: opt.key === question.correctAnswer,
                    sequence: idx,
                  })),
                },
              },
            })

            successCount++

            // Update progress
            await prisma.importJob.update({
              where: { id: importJobId },
              data: { successCount },
            })

            // Update job progress
            await job.updateProgress(((i + 1) / questions.length) * 100)
          } catch (error: any) {
            console.error(`Error importing question ${i + 1}:`, error)
            failedCount++
            errors.push(`Question ${i + 1}: ${error.message}`)

            await prisma.importJob.update({
              where: { id: importJobId },
              data: { failedCount },
            })
          }
        }

        // Mark job as completed
        await prisma.importJob.update({
          where: { id: importJobId },
          data: {
            status: 'completed',
            completedAt: new Date(),
            errors: errors.length > 0 ? errors : null,
          },
        })

        console.log(
          `Import job ${importJobId} completed: ${successCount} success, ${failedCount} failed`
        )
      } catch (error: any) {
        console.error(`Import job ${importJobId} failed:`, error)

        // Mark job as failed
        await prisma.importJob.update({
          where: { id: importJobId },
          data: {
            status: 'failed',
            errors: [error.message],
            completedAt: new Date(),
          },
        })

        throw error
      }
    },
    {
      connection,
      concurrency: 1, // Process one import at a time
    }
  )

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err)
  })

  return worker
}