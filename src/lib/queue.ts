import { Queue, Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { prisma } from './prisma'
import type { ParsedQuestion } from './question-parser'

export const connection = new Redis({
  host:     process.env.REDIS_HOST     || 'localhost',
  port:     parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
})

// ─── Question import queue (unchanged) ───────────────────────────────────────

export const questionImportQueue = new Queue('question-import', { connection })

interface ImportJobData {
  importJobId: string
  topicId:     string
  questions:   ParsedQuestion[]
}

export async function queueQuestionImport(
  importJobId: string,
  topicId:     string,
  questions:   ParsedQuestion[]
) {
  await questionImportQueue.add('import-questions', { importJobId, topicId, questions })
}

export function startQuestionImportWorker() {
  const worker = new Worker<ImportJobData>(
    'question-import',
    async (job: Job<ImportJobData>) => {
      const { importJobId, topicId, questions } = job.data
      console.log(`Processing import job: ${importJobId}`)

      await prisma.importJob.update({ where: { id: importJobId }, data: { status: 'processing' } })

      let successCount = 0
      let failedCount  = 0
      const errors: string[] = []

      try {
        for (let i = 0; i < questions.length; i++) {
          const question = questions[i]
          try {
            await prisma.question.create({
              data: {
                statement:     question.statement,
                imageUrl:      question.statementImage,
                topicId,
                marks:         question.marks,
                negativeMarks: question.negativeMarks,
                difficulty:    question.difficulty,
                explanation:   question.explanation,
                isActive:      true,
                options: {
                  create: question.options.map((opt, idx) => ({
                    text:      opt.text,
                    imageUrl:  opt.imageUrl,
                    optionKey: opt.key,
                    isCorrect: opt.key === question.correctAnswer,
                    sequence:  idx,
                  })),
                },
              },
            })
            successCount++
            await prisma.importJob.update({ where: { id: importJobId }, data: { successCount } })
            await job.updateProgress(((i + 1) / questions.length) * 100)
          } catch (error: any) {
            console.error(`Error importing question ${i + 1}:`, error)
            failedCount++
            errors.push(`Question ${i + 1}: ${error.message}`)
            await prisma.importJob.update({ where: { id: importJobId }, data: { failedCount } })
          }
        }

        await prisma.importJob.update({
          where: { id: importJobId },
          data:  { status: 'completed', completedAt: new Date(), errors: errors.length > 0 ? errors : null },
        })
        console.log(`Import job ${importJobId} completed: ${successCount} success, ${failedCount} failed`)
      } catch (error: any) {
        console.error(`Import job ${importJobId} failed:`, error)
        await prisma.importJob.update({
          where: { id: importJobId },
          data:  { status: 'failed', errors: [error.message], completedAt: new Date() },
        })
        throw error
      }
    },
    { connection, concurrency: 1 }
  )

  worker.on('completed', (job) => console.log(`Import job ${job.id} completed`))
  worker.on('failed',    (job, err) => console.error(`Import job ${job?.id} failed:`, err))
  return worker
}

// ─── Exam grading queue ───────────────────────────────────────────────────────

export const examGradingQueue = new Queue('exam-grading', {
  connection,
  defaultJobOptions: {
    attempts:         5,
    backoff:          { type: 'exponential', delay: 30_000 },
    removeOnComplete: 100,
    removeOnFail:     200,
  },
})

export interface GradingJobData {
  attemptId:  string
  examId:     string
  userId:     string
  isOfficial: boolean
}

export async function queueExamGrading(data: GradingJobData) {
  await examGradingQueue.add('grade-attempt', data, {
    jobId: `grade-${data.attemptId}`,
  })
}

export function startExamGradingWorker() {
  const worker = new Worker<GradingJobData>(
    'exam-grading',
    async (job: Job<GradingJobData>) => {
      const { attemptId } = job.data
      console.log(`[Grader] Processing attempt ${attemptId}`)

      // ── Idempotency check — must be first ─────────────────────────────────
      const current = await prisma.attempt.findUnique({
        where:  { id: attemptId },
        select: { status: true },
      })
      if (!current) {
        console.warn(`[Grader] Attempt ${attemptId} not found — skipping`)
        return
      }
      if (current.status === 'graded') {
        console.log(`[Grader] Attempt ${attemptId} already graded — skipping (idempotent)`)
        return
      }

      // Mark as grading
      await prisma.attempt.update({
        where: { id: attemptId },
        data:  { status: 'grading' },
      })

      try {
        const attempt = await prisma.attempt.findUnique({
          where:   { id: attemptId },
          include: {
            exam: {
              include: {
                questions: {
                  include: {
                    question: {
                      include: {
                        options: true,
                        topic:   { select: { name: true } },
                      },
                    },
                  },
                  orderBy: { sequence: 'asc' },
                },
              },
            },
          },
        })

        if (!attempt) throw new Error(`Attempt ${attemptId} vanished mid-grading`)

        const userAnswers = (attempt.answers as Record<string, any>) || {}
        let score = 0, correctCount = 0, wrongCount = 0, unattempted = 0

        for (const eq of attempt.exam.questions) {
          const question     = eq.question
          const userResponse = userAnswers[question.id]

          if (question.type === 'numerical') {
            const userNum = userResponse?.numericalAnswer ?? null
            if (userNum === null || userNum === undefined) {
              unattempted++
            } else if (
              question.correctAnswerExact !== null &&
              question.correctAnswerExact !== undefined
            ) {
              if (userNum === question.correctAnswerExact) { correctCount++; score += question.marks }
              else                                         { wrongCount++;   score -= question.negativeMarks }
            } else if (
              question.correctAnswerMin !== null &&
              question.correctAnswerMax !== null
            ) {
              if (userNum >= question.correctAnswerMin! && userNum <= question.correctAnswerMax!) { correctCount++; score += question.marks }
              else                                                                                 { wrongCount++;   score -= question.negativeMarks }
            } else {
              unattempted++
            }
          } else {
            const correctOption = question.options.find(o => o.isCorrect)
            const correctAnswer = correctOption?.optionKey ?? null
            const userAnswer    = userResponse?.selectedOption ?? null
            if (userAnswer === null)               unattempted++
            else if (userAnswer === correctAnswer) { correctCount++; score += question.marks }
            else                                   { wrongCount++;   score -= question.negativeMarks }
          }
        }

        const timeTaken  = Math.floor(
          (new Date(attempt.submittedAt!).getTime() - attempt.startedAt.getTime()) / 1000
        )
        const percentage = attempt.exam.totalMarks > 0
          ? (score / attempt.exam.totalMarks) * 100
          : 0

        // ── Persist raw score only — rank/percentile set by batch job later ──
        await prisma.$transaction(async (tx) => {
          await tx.attempt.update({
            where: { id: attemptId },
            data:  {
              score,
              percentage,
              correctAnswers: correctCount,
              wrongAnswers:   wrongCount,
              unattempted,
              timeSpentSec:   timeTaken,
              status:         'graded',
            },
          })
        })

        console.log(`[Grader] Done — attempt ${attemptId} | score: ${score}`)

      } catch (error) {
        // Revert so the job can be retried cleanly
        await prisma.attempt.update({
          where: { id: attemptId },
          data:  { status: 'grading_queued' },
        })
        throw error
      }
    },
    { connection, concurrency: 5 }
  )

  worker.on('completed', (job) => console.log(`[Grader] Job ${job.id} completed`))
  worker.on('failed',    (job, err) => console.error(`[Grader] Job ${job?.id} failed:`, err))
  return worker
}