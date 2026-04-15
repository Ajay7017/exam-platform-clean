import { startQuestionImportWorker, startExamGradingWorker } from '@/lib/queue'
import { prisma } from '@/lib/prisma'

console.log('Starting workers...')

const importWorker  = startQuestionImportWorker()
const gradingWorker = startExamGradingWorker()

console.log('Both workers started and listening for jobs')

// ─── Batch Rank Calculator ────────────────────────────────────────────────────
// Runs every 2 minutes. Finds exams with newly graded official attempts
// that have no rank yet, and calculates all ranks in one DB operation per exam.

async function calculatePendingRanks() {
  try {
    const examsNeedingRanks = await prisma.attempt.findMany({
      where: {
        status:     'graded',
        isOfficial: true,
        rank:       null,
      },
      select:   { examId: true },
      distinct: ['examId'],
    })

    if (examsNeedingRanks.length === 0) return

    console.log(`[RankBatch] Found ${examsNeedingRanks.length} exam(s) needing rank calculation`)

    for (const { examId } of examsNeedingRanks) {

      const attempts = await prisma.attempt.findMany({
        where:   { examId, status: 'graded', isOfficial: true },
        select:  { id: true, userId: true, score: true, timeSpentSec: true, percentage: true, submittedAt: true },
        orderBy: [{ score: 'desc' }, { timeSpentSec: 'asc' }],
      })

      if (attempts.length === 0) continue

      const total = attempts.length

      const updates = attempts.map((attempt, index) => {
        const rank       = index + 1
        const percentile = total > 1
          ? ((total - rank) / (total - 1)) * 100
          : 100
        return { ...attempt, rank, percentile }
      })

      // Write everything in one transaction per exam.
      // Uses raw SQL for bulk rank update — avoids N sequential updates
      // which would timeout Neon's 15s interactive transaction limit.
      await prisma.$transaction(async (tx) => {

        if (updates.length > 0) {
          // Single bulk UPDATE — all rows in one query.
          // Uses ::text not ::uuid because schema uses CUIDs (@default(cuid()))
          const values = updates
            .map(u => `('${u.id}'::text, ${u.rank}::int, ${u.percentile}::float8)`)
            .join(', ')

          await tx.$executeRawUnsafe(`
            UPDATE "Attempt" AS a
            SET    rank       = v.rank::int,
                   percentile = v.percentile::float8
            FROM   (VALUES ${values}) AS v(id, rank, percentile)
            WHERE  a.id = v.id
          `)
        }

        // Rebuild leaderboard for this exam from scratch
        // Only create leaderboard entry if user has no existing entry
        for (const u of updates) {
          const existing = await tx.leaderboardEntry.findUnique({
            where: { examId_userId: { examId, userId: u.userId } },
          })
          if (!existing) {
            await tx.leaderboardEntry.create({
              data: {
                examId,
                userId:      u.userId,
                attemptId:   u.id,
                score:       u.score        ?? 0,
                percentage:  u.percentage   ?? 0,
                rank:        u.rank,
                timeTaken:   u.timeSpentSec ?? 0,
                submittedAt: u.submittedAt  ?? new Date(),
              },
            })
          }
        }
        })

      console.log(`[RankBatch] Exam ${examId} — ranked ${total} attempts`)
    }

  } catch (error) {
    console.error('[RankBatch] Error during rank calculation:', error)
    // Non-fatal — will retry on next interval
  }
}

// Run immediately on worker start, then every 2 minutes
calculatePendingRanks()
const rankInterval = setInterval(calculatePendingRanks, 2 * 60 * 1000)

// ─── Graceful shutdown ────────────────────────────────────────────────────────

async function shutdown() {
  console.log('Shutting down workers...')
  clearInterval(rankInterval)
  await Promise.all([importWorker.close(), gradingWorker.close()])
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT',  shutdown)