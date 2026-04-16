// src/workers/exam-sync-worker.ts
import { PrismaClient } from '@prisma/client'
import { Redis } from 'ioredis'

// Initialize independent connections for the worker
const prisma = new PrismaClient()
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  // Add TLS if required by your Railway production env
  ...(process.env.REDIS_TLS === 'true' && {
    tls: { rejectUnauthorized: false }
  })
})

const SYNC_INTERVAL_MS = 10000; // Run every 10 seconds

async function processSyncQueue() {
  try {
    // 1. Get all attempt IDs that have unsaved changes
    const pendingAttempts = await redis.smembers('exam:pending_sync_attempts')

    if (!pendingAttempts || pendingAttempts.length === 0) {
      return; // Queue is empty, go back to sleep
    }

    console.log(`[SYNC] Found ${pendingAttempts.length} attempts to flush to Neon...`)

    // 2. Loop through each attempt and sync it
    for (const attemptId of pendingAttempts) {
      try {
        // Fetch the raw JSON payload we saved in the API route
        const rawData = await redis.get(`exam:autosave:${attemptId}`)
        
        if (!rawData) {
          // If the data expired or vanished, remove it from the pending list
          await redis.srem('exam:pending_sync_attempts', attemptId)
          continue
        }

        const data = JSON.parse(rawData)

        // 3. Update PostgreSQL
        await prisma.attempt.update({
          where: { id: attemptId },
          data: {
            answers: data.answers,
            timePerQuestion: data.timePerQuestion,
            updatedAt: new Date(data.updatedAt || Date.now()),
          }
        })

        // 4. On success, remove it from the "Pending Sync" list
        // (We leave the actual cache key alive so the student's API reads are still fast)
        await redis.srem('exam:pending_sync_attempts', attemptId)
        
        console.log(`✅ [SYNC] Successfully flushed attempt: ${attemptId}`)

      } catch (err: any) {
        // If an individual update fails (e.g., Neon connection hiccup), 
        // we DO NOT remove it from the list. It will retry in 10 seconds.
        console.error(`❌ [SYNC] Failed to flush attempt ${attemptId}:`, err.message)
      }
    }
  } catch (error: any) {
    console.error(`💥 [SYNC] Critical worker error:`, error.message)
  }
}

// Start the continuous loop
console.log('🚀 Exam Sync Worker started. Polling every 10 seconds...')

setInterval(() => {
  processSyncQueue()
}, SYNC_INTERVAL_MS)

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down worker...')
  await prisma.$disconnect()
  redis.quit()
  process.exit(0)
})