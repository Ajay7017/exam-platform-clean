// src/scripts/backfill-ranks.ts
import { prisma } from '@/lib/prisma'

async function backfillRanks() {
  console.log('🔄 Starting rank backfill...')

  // Get all completed attempts without rank/percentile
  const attemptsToFix = await prisma.attempt.findMany({
    where: {
      status: 'completed',
      OR: [
        { rank: null },
        { percentile: null }
      ]
    },
    include: {
      exam: true
    }
  })

  console.log(`📊 Found ${attemptsToFix.length} attempts to backfill`)

  for (const attempt of attemptsToFix) {
    console.log(`\n🔧 Processing attempt ${attempt.id} for exam ${attempt.exam.title}`)

    // Get all leaderboard entries for this exam
    const allEntries = await prisma.leaderboardEntry.findMany({
      where: { examId: attempt.examId },
      select: {
        userId: true,
        score: true,
        timeTaken: true,
      },
      orderBy: [
        { score: 'desc' },
        { timeTaken: 'asc' }
      ]
    })

    // Find this user's rank
    const userRank = allEntries.findIndex(
      entry => entry.userId === attempt.userId
    ) + 1

    // Calculate percentile
    const totalAttempts = allEntries.length
    const percentile = totalAttempts > 1 
      ? ((totalAttempts - userRank) / (totalAttempts - 1)) * 100 
      : 100

    // Update attempt
    await prisma.attempt.update({
      where: { id: attempt.id },
      data: {
        rank: userRank,
        percentile: percentile
      }
    })

    console.log(`✅ Updated: Rank #${userRank}, Percentile: ${percentile.toFixed(2)}%`)
  }

  console.log('\n🎉 Backfill complete!')
  process.exit(0)
}

backfillRanks().catch(error => {
  console.error('❌ Backfill failed:', error)
  process.exit(1)
})