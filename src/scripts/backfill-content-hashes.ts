// src/scripts/backfill-content-hashes.ts
// ONE-TIME script: computes and stores contentHash for all existing questions.
// Safe to run multiple times.
//
// Run with:
//   npx ts-node --project tsconfig.scripts.json src/scripts/backfill-content-hashes.ts

import { PrismaClient } from '@prisma/client'
import { computeQuestionHash } from '../lib/question-parser'

const prisma = new PrismaClient()

const BATCH_SIZE = 100

// Sentinel value for questions where hash cannot be computed (image-only).
// Stored in DB so they exit the WHERE contentHash = null filter permanently.
// The duplicate check logic already skips questions with null hash at check
// time, so this sentinel is never used in hash comparisons.
const SKIP_SENTINEL = 'SKIP'

async function backfill() {
  console.log('═══════════════════════════════════════════')
  console.log('  Content Hash Backfill — Starting')
  console.log('═══════════════════════════════════════════')

  const totalNeedingBackfill = await prisma.question.count({
    where: { contentHash: null }
  })

  if (totalNeedingBackfill === 0) {
    console.log('✅ All questions already processed. Nothing to do.')
    await prisma.$disconnect()
    return
  }

  console.log(`📊 Found ${totalNeedingBackfill} questions needing processing`)
  console.log(`📦 Processing in batches of ${BATCH_SIZE}`)
  console.log('')

  let processed = 0
  let hashed = 0
  let skippedImageOnly = 0
  let failed = 0
  let batchNum = 0

  while (true) {
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
          select: { optionKey: true, text: true },
          orderBy: { sequence: 'asc' }
        }
      },
      take: BATCH_SIZE,
    })

    if (questions.length === 0) break

    batchNum++
    console.log(`Processing batch ${batchNum} (${questions.length} questions)...`)

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

        // ✅ FIX: store sentinel for image-only questions so they exit the
        // WHERE contentHash = null filter and never loop again
        const valueToStore = hash ?? SKIP_SENTINEL

        await prisma.question.update({
          where: { id: q.id },
          data: { contentHash: valueToStore },
        })

        if (hash === null) {
          skippedImageOnly++
        } else {
          hashed++
        }
        processed++

      } catch (error: any) {
        failed++
        processed++
        console.error(`  ❌ Question ${q.id} failed: ${error.message}`)

        // ✅ FIX: mark failed questions with sentinel so they don't loop
        // infinitely. They can be inspected manually if needed.
        try {
          await prisma.question.update({
            where: { id: q.id },
            data: { contentHash: SKIP_SENTINEL },
          })
        } catch {
          // If this also fails, script will retry on next run — acceptable
        }
      }
    }

    const remaining = await prisma.question.count({ where: { contentHash: null } })
    const percent = Math.round(((totalNeedingBackfill - remaining) / totalNeedingBackfill) * 100)
    console.log(`  ✓ Batch done — Remaining: ${remaining} (${percent}% done) | Hashed: ${hashed} | Skipped: ${skippedImageOnly} | Failed: ${failed}`)

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
  console.log('✅ Done. All questions have exited the null hash filter.')
  console.log('   Image-only questions stored with SKIP sentinel — excluded from duplicate checks automatically.')

  await prisma.$disconnect()
}

backfill().catch(async (error) => {
  console.error('💥 Fatal error:', error)
  await prisma.$disconnect()
  process.exit(1)
})