import { z } from 'zod'

// Environment schema validation
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // Redis (optional for development)
  REDIS_URL: z.string().optional(),
  
  // API Keys (required for data fetching)
  POLYGON_API_KEY: z.string().min(1, 'POLYGON_API_KEY is required for market data'),
  FINNHUB_API_KEY: z.string().min(1, 'FINNHUB_API_KEY is required for earnings data'),
  // BENZINGA_API_KEY: z.string().optional(), // Not used anymore
  
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  
  // Queue
  QUEUE_REDIS_HOST: z.string().optional(),
  QUEUE_REDIS_PORT: z.string().optional(),
  QUEUE_REDIS_PASSWORD: z.string().optional(),
  
  // WebSocket
  WS_PORT: z.string().optional(),
  
  // Monitoring (optional)
  DATADOG_API_KEY: z.string().optional(),
  NEW_RELIC_LICENSE_KEY: z.string().optional(),
})

// Validate and parse environment variables
export function validateEnv() {
  try {
    const env = envSchema.parse(process.env)
    console.log('[ENV] ✅ Environment validation passed')
    return env
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[ENV] ❌ Environment validation failed:')
      error.issues.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      
      // In development, show helpful messages
      if (process.env.NODE_ENV === 'development') {
        console.log('\n[ENV] 💡 To fix this:')
        console.log('  1. Copy env.example to .env.local')
        console.log('  2. Fill in your API keys')
        console.log('  3. Restart the application\n')
      }
    }
    
    throw new Error('Environment validation failed')
  }
}

// Type-safe environment object
export type ValidatedEnv = z.infer<typeof envSchema>

// Export validated env (call this in app startup)
export const env = validateEnv()
