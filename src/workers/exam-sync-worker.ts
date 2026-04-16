import { PrismaClient } from '@prisma/client'
import { Redis } from 'ioredis'
import http from 'http'

// ─── CATCH SILENT CRASHES ─────────────────────────────────────────
process.on('unhandledRejection', (reason: any) => {
  console.error('💥 UNHANDLED REJECTION - This is what is killing the worker:')
  console.error(reason?.message || reason)
  console.error(reason?.stack)
})

process.on('uncaughtException', (error) => {
  console.error('💥 UNCAUGHT EXCEPTION - This is what is killing the worker:')
  console.error(error.message)
  console.error(error.stack)
})

// ─── RAILWAY HEALTH CHECK FIX ─────────────────────────────────────
const port = process.env.PORT || 8080;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Exam Sync Worker is running');
}).listen(port);

console.log(`[HEALTHCHECK] Dummy server listening on port ${port}`);

// ─── INITIALIZATION ───────────────────────────────────────────────
const prisma = new PrismaClient()
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  ...(process.env.REDIS_TLS === 'true' && {
    tls: { rejectUnauthorized: false }
  })
})

const SYNC_INTERVAL_MS = 10000;

async function processSyncQueue() {
  try {
    const pendingAttempts = await redis.smembers('exam:pending_sync_attempts')

    if (!pendingAttempts || pendingAttempts.length === 0) return;

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
        console.log(`✅ [SYNC] Successfully flushed attempt: ${attemptId}`)

      } catch (err: any) {
        console.error(`❌ [SYNC] Failed to flush attempt ${attemptId}:`, err.message)
      }
    }
  } catch (error: any) {
    console.error(`💥 [SYNC] Critical worker error:`, error.message)
  }
}

console.log('🚀 Exam Sync Worker started. Polling every 10 seconds...')

setInterval(() => {
  processSyncQueue()
}, SYNC_INTERVAL_MS)

process.on('SIGINT', async () => {
  console.log('Shutting down worker...')
  await prisma.$disconnect()
  redis.quit()
  process.exit(0)
})