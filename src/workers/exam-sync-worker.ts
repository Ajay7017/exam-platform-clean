import { PrismaClient } from '@prisma/client'
import { startQuestionImportWorker, startExamGradingWorker } from '@/lib/queue'
import redis from '@/lib/redis'
import http from 'http'

const PORT = parseInt(process.env.PORT || '8080')
http.createServer((req, res) => {
  res.writeHead(200)
  res.end('ok')
}).listen(PORT, '0.0.0.0', () => {
  console.log(`[HEALTHCHECK] Listening on port ${PORT}`)
})

// ─── CATCH SILENT CRASHES ─────────────────────────────────────────
process.on('unhandledRejection', (reason: any) => {
  console.error('💥 UNHANDLED REJECTION:', reason?.message || reason)
  console.error(reason?.stack)
})

process.on('uncaughtException', (error) => {
  console.error('💥 UNCAUGHT EXCEPTION:', error.message)
  console.error(error.stack)
})

const prisma = new PrismaClient()

// ─── START BULLMQ WORKERS ─────────────────────────────────────────
console.log('Starting BullMQ workers...')
const importWorker  = startQuestionImportWorker()
const gradingWorker = startExamGradingWorker()
console.log('✅ Grading + Import workers listening for jobs')

// ─── REDIS → POSTGRES SYNC ────────────────────────────────────────
const SYNC_INTERVAL_MS = 10000

async function processSyncQueue() {
  if (!redis) {
    console.warn('[SYNC] Redis not available, skipping sync')
    return
  }
  try {
    const pendingAttempts = await redis.smembers('exam:pending_sync_attempts')
    if (!pendingAttempts || pendingAttempts.length === 0) return

    console.log(`[SYNC] Found ${pendingAttempts.length} attempts to flush to Neon...`)

    for (const attemptId of pendingAttempts) {
      try {
        const rawData = await redis.get(`exam:autosave:${attemptId}`)
        if (!rawData) {
          await redis.srem('exam:pending_sync_attempts', attemptId)
          continue
        }

        const data = JSON.parse(rawData)

        await prisma.attempt.update({
          where: { id: attemptId },
          data: {
            answers: data.answers,
            timePerQuestion: data.timePerQuestion,
            updatedAt: new Date(data.updatedAt || Date.now()),
          }
        })

        await redis.srem('exam:pending_sync_attempts', attemptId)
        console.log(`✅ [SYNC] Flushed attempt: ${attemptId}`)

      } catch (err: any) {
        console.error(`❌ [SYNC] Failed to flush attempt ${attemptId}:`, err.message)
      }
    }
  } catch (error: any) {
    console.error(`💥 [SYNC] Critical error:`, error.message)
  }
}

// ─── RANK CALCULATOR ──────────────────────────────────────────────
async function calculatePendingRanks() {
  try {
    const examsNeedingRanks = await prisma.attempt.findMany({
      where: { status: 'graded', isOfficial: true, rank: null },
      select: { examId: true },
      distinct: ['examId'],
    })

    if (examsNeedingRanks.length === 0) return

    console.log(`[RankBatch] Found ${examsNeedingRanks.length} exam(s) needing ranks`)

    for (const { examId } of examsNeedingRanks) {
      // Fetch ALL graded official attempts for this exam
      // not just the ones with rank=null
      // because a new submission shifts everyone's rank
      const attempts = await prisma.attempt.findMany({
        where: {
          examId,
          status: 'graded',
          isOfficial: true
        },
        select: {
          id: true,
          userId: true,
          score: true,
          timeSpentSec: true,
          percentage: true,
          submittedAt: true
        },
        orderBy: [
          { score: 'desc' },
          { timeSpentSec: 'asc' }
        ],
      })

      if (attempts.length === 0) continue

      const total = attempts.length

      const updates = attempts.map((attempt, index) => {
        const rank = index + 1
        // Standard competitive exam percentile formula
        // "percentage of students you scored better than"
        // Rank 1 of 100 → 99% (better than 99 out of 100)
        // Rank 1 of 1  → 0%  (no one else to compare against)
        const percentile = total > 1
          ? parseFloat((((total - rank) / total) * 100).toFixed(2))
          : 0
        return { ...attempt, rank, percentile }
      })

      await prisma.$transaction(async (tx) => {
        // Step A — Bulk update Attempt ranks + percentiles
        const values = updates
          .map(u => `('${u.id}'::text, ${u.rank}::int, ${u.percentile}::float8)`)
          .join(', ')

        await tx.$executeRawUnsafe(`
          UPDATE "Attempt" AS a
          SET rank = v.rank::int, percentile = v.percentile::float8
          FROM (VALUES ${values}) AS v(id, rank, percentile)
          WHERE a.id = v.id
        `)

        // Step B — Upsert LeaderboardEntry for every attempt
        // CRITICAL FIX: was "if (!existing) create" before
        // meaning rank never updated after initial creation
        // Now we always upsert so rank + percentile stay current
        for (const u of updates) {
          await tx.leaderboardEntry.upsert({
            where: {
              examId_userId: {
                examId,
                userId: u.userId
              }
            },
            create: {
              examId,
              userId:      u.userId,
              attemptId:   u.id,
              score:       u.score       ?? 0,
              percentage:  u.percentage  ?? 0,
              percentile:  u.percentile,
              rank:        u.rank,
              timeTaken:   u.timeSpentSec ?? 0,
              submittedAt: u.submittedAt  ?? new Date(),
            },
            update: {
              score:       u.score       ?? 0,
              percentage:  u.percentage  ?? 0,
              percentile:  u.percentile,
              rank:        u.rank,
              timeTaken:   u.timeSpentSec ?? 0,
              submittedAt: u.submittedAt  ?? new Date(),
            }
          })
        }
      })

      console.log(`[RankBatch] Exam ${examId} — ranked ${total} attempts, percentiles updated`)
    }
  } catch (error) {
    console.error('[RankBatch] Error:', error)
  }
}

// ─── START INTERVALS ──────────────────────────────────────────────
console.log('🚀 Worker started. Redis sync every 10s, Rank calc every 2min')

setInterval(processSyncQueue, SYNC_INTERVAL_MS)

calculatePendingRanks() // Run immediately on start
const rankInterval = setInterval(calculatePendingRanks, 2 * 60 * 1000)

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────────────
async function shutdown() {
  console.log('Shutting down gracefully...')
  clearInterval(rankInterval)
  await Promise.all([importWorker.close(), gradingWorker.close()])
  await prisma.$disconnect()
  if (redis) redis.quit()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)