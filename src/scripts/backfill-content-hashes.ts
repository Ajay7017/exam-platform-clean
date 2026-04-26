// src/scripts/backfill-content-hashes.ts
// ─────────────────────────────────────────────────────────────────────────────
// ONE-TIME script: computes and stores contentHash for all existing questions
// that currently have contentHash = null.
//
// Safe to run multiple times — skips questions that already have a hash.
// Safe to run on production — read-heavy, batched writes, no deletes.
//
// Run with:
//   npx ts-node --compiler-options '{"module":"CommonJS"}' src/scripts/backfill-content-hashes.ts
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client'
import { computeQuestionHash } from '../lib/question-parser'

const prisma = new PrismaClient()

const BATCH_SIZE = 100 // fetch 100 questions at a time — safe for Neon

async function backfill() {
  console.log('═══════════════════════════════════════════')
  console.log('  Content Hash Backfill — Starting')
  console.log('═══════════════════════════════════════════')

  // Count how many need backfill
  const totalNeedingBackfill = await prisma.question.count({
    where: { contentHash: null }
  })

  if (totalNeedingBackfill === 0) {
    console.log('✅ All questions already have content hashes. Nothing to do.')
    await prisma.$disconnect()
    return
  }

  console.log(`📊 Found ${totalNeedingBackfill} questions needing hash computation`)
  console.log(`📦 Processing in batches of ${BATCH_SIZE}`)
  console.log('')

  let processed = 0
  let hashed = 0
  let skippedImageOnly = 0
  let failed = 0
  let page = 0

  while (true) {
    // Fetch batch of questions without hash
    const questions = await prisma.question.findMany({
      where: { contentHash: null },
      select: {
        id: true,
        statement: true,
        type: true,
        correctAnswerExact: true,
        correctAnswerMin: true,
        correctAnswerMax: true,
        matchPairs: true,
        options: {
          select: {
            optionKey: true,
            text: true,
          },
          orderBy: { sequence: 'asc' }
        }
      },
      take: BATCH_SIZE,
      skip: page * BATCH_SIZE,
    })

    if (questions.length === 0) break

    console.log(`Processing batch ${page + 1} (${questions.length} questions)...`)

    for (const q of questions) {
      try {
        const optMap: Record<string, string> = {}
        for (const opt of q.options) {
          optMap[opt.optionKey] = opt.text
        }

        const hash = computeQuestionHash({
          questionType: q.type as 'mcq' | 'numerical' | 'match',
          statement: q.statement,
          optionA: optMap['A'] || null,
          optionB: optMap['B'] || null,
          optionC: optMap['C'] || null,
          optionD: optMap['D'] || null,
          correctAnswerExact: q.correctAnswerExact,
          correctAnswerMin: q.correctAnswerMin,
          correctAnswerMax: q.correctAnswerMax,
          matchPairs: q.matchPairs,
        })

        if (hash === null) {
          // Image-only options or insufficient data — leave as null
          skippedImageOnly++
          processed++
          continue
        }

        // Check if this hash already exists in DB (another question has it)
        // If so, this is a duplicate that already exists — still store the hash
        // so the system can detect it going forward
        await prisma.question.update({
          where: { id: q.id },
          data: { contentHash: hash },
        })

        hashed++
        processed++

      } catch (error: any) {
        failed++
        processed++
        console.error(`  ❌ Question ${q.id} failed: ${error.message}`)
      }
    }

    const percent = Math.round((processed / totalNeedingBackfill) * 100)
    console.log(`  ✓ Batch done — ${processed}/${totalNeedingBackfill} (${percent}%) | Hashed: ${hashed} | Skipped: ${skippedImageOnly} | Failed: ${failed}`)

    page++

    // Small delay between batches to avoid overwhelming Neon
    // 50ms is enough — keeps connection pool happy
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  console.log('')
  console.log('═══════════════════════════════════════════')
  console.log('  Backfill Complete')
  console.log('═══════════════════════════════════════════')
  console.log(`  Total processed : ${processed}`)
  console.log(`  Hashed          : ${hashed}`)
  console.log(`  Skipped (images): ${skippedImageOnly}`)
  console.log(`  Failed          : ${failed}`)
  console.log('')

  if (failed > 0) {
    console.log(`⚠️  ${failed} questions failed — run the script again to retry them.`)
    console.log('   Failed questions still have contentHash = null and will be retried.')
  } else {
    console.log('✅ All questions backfilled successfully.')
  }

  await prisma.$disconnect()
}

backfill().catch(async (error) => {
  console.error('💥 Fatal error:', error)
  await prisma.$disconnect()
  process.exit(1)
})