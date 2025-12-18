// src/lib/redis.ts
import { Redis } from 'ioredis'

// Validate Redis configuration
const validateRedisConfig = () => {
  if (!process.env.REDIS_HOST) {
    console.warn('⚠️ REDIS_HOST not configured. Caching disabled.')
    return false
  }
  return true
}

// Create Redis client with proper configuration
export const redis = validateRedisConfig()
  ? new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      // Production settings
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: true,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      // TLS for production
      ...(process.env.REDIS_TLS === 'true' && {
        tls: {
          rejectUnauthorized: false // For self-signed certs
        }
      })
    })
  : null

// Graceful error handling
if (redis) {
  redis.on('error', (error) => {
    console.error('Redis connection error:', error)
  })

  redis.on('connect', () => {
    console.log('✅ Redis connected successfully')
  })
}

/**
 * Cache wrapper with error handling
 * Falls back gracefully if Redis is unavailable
 */
export const cache = {
  async get(key: string): Promise<string | null> {
    if (!redis) return null
    try {
      return await redis.get(key)
    } catch (error) {
      console.error('Redis GET error:', error)
      return null
    }
  },

  async set(key: string, value: string, expirySeconds?: number): Promise<void> {
    if (!redis) return
    try {
      if (expirySeconds) {
        await redis.setex(key, expirySeconds, value)
      } else {
        await redis.set(key, value)
      }
    } catch (error) {
      console.error('Redis SET error:', error)
    }
  },

  async del(key: string): Promise<void> {
    if (!redis) return
    try {
      await redis.del(key)
    } catch (error) {
      console.error('Redis DEL error:', error)
    }
  },

  async delPattern(pattern: string): Promise<void> {
    if (!redis) return
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      console.error('Redis DEL pattern error:', error)
    }
  }
}

export default redis