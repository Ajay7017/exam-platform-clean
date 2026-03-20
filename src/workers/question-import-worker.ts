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
    // Find exams that have at least one graded official attempt with null rank
    const examsNeedingRanks = await prisma.attempt.findMany({
      where: {
        status:     'graded',
        isOfficial: true,
        rank:       null,
      },
      select:  { examId: true },
      distinct: ['examId'],
    })

    if (examsNeedingRanks.length === 0) return

    console.log(`[RankBatch] Found ${examsNeedingRanks.length} exam(s) needing rank calculation`)

    for (const { examId } of examsNeedingRanks) {

      // Fetch ALL graded official attempts for this exam in one query
      // Sorted by score desc, time asc — this is the rank order
      const attempts = await prisma.attempt.findMany({
        where:   { examId, status: 'graded', isOfficial: true },
        select:  { id: true, userId: true, score: true, timeSpentSec: true, percentage: true, submittedAt: true },
        orderBy: [{ score: 'desc' }, { timeSpentSec: 'asc' }],
      })

      if (attempts.length === 0) continue

      const total = attempts.length

      // Calculate rank and percentile in memory — zero extra DB calls
      const updates = attempts.map((attempt, index) => {
        const rank       = index + 1
        const percentile = total > 1
          ? ((total - rank) / (total - 1)) * 100
          : 100
        return { ...attempt, rank, percentile }
      })

      // Write everything in one transaction per exam
      await prisma.$transaction(async (tx) => {

        // Update all attempt records with rank + percentile
        for (const u of updates) {
          await tx.attempt.update({
            where: { id: u.id },
            data:  { rank: u.rank, percentile: u.percentile },
          })
        }

        // Rebuild leaderboard for this exam from scratch
        await tx.leaderboardEntry.deleteMany({ where: { examId } })

        await tx.leaderboardEntry.createMany({
          data: updates.map(u => ({
            examId,
            userId:      u.userId,
            attemptId:   u.id,
            score:       u.score       ?? 0,
            percentage:  u.percentage  ?? 0,
            rank:        u.rank,
            timeTaken:   u.timeSpentSec ?? 0,
            submittedAt: u.submittedAt  ?? new Date(),
          })),
        })
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