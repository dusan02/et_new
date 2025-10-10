/**
 * 🔧 Centralized Environment Configuration
 * Validates and provides type-safe access to environment variables
 */

import { z } from 'zod'

// Environment schema with validation
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  FINNHUB_API_KEY: z.string().min(1, 'FINNHUB_API_KEY is required'),
  POLYGON_API_KEY: z.string().min(1, 'POLYGON_API_KEY is required'),
  REDIS_URL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  CRON_ENABLED: z.string().optional(),
  CRON_TIMEZONE: z.string().default('America/New_York'),
})

// Parse and validate environment variables
export const env = (() => {
  try {
    const parsed = EnvSchema.safeParse(process.env)
    
    if (!parsed.success) {
      console.error('❌ [ENV][ERROR] Invalid environment configuration:')
      console.error(parsed.error.flatten().fieldErrors)
      throw new Error('Invalid environment configuration')
    }
    
    console.log('✅ [ENV] Environment loaded successfully')
    console.log(`[ENV] NODE_ENV=${parsed.data.NODE_ENV}`)
    console.log(`[ENV] DATABASE_URL=${parsed.data.DATABASE_URL.substring(0, 30)}...`)
    console.log(`[ENV] API Keys: FINNHUB=${parsed.data.FINNHUB_API_KEY ? 'SET' : 'NOT SET'}, POLYGON=${parsed.data.POLYGON_API_KEY ? 'SET' : 'NOT SET'}`)
    
    return parsed.data
  } catch (error) {
    console.error('❌ [ENV][FATAL] Failed to load environment:', error)
    process.exit(1)
  }
})()

// Export individual variables for convenience
export const {
  NODE_ENV,
  DATABASE_URL,
  FINNHUB_API_KEY,
  POLYGON_API_KEY,
  REDIS_URL,
  NEXT_PUBLIC_APP_URL,
  CRON_ENABLED,
  CRON_TIMEZONE,
} = env
