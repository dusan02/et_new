import { z } from 'zod'

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  FINNHUB_API_KEY: z.string().min(1, 'FINNHUB_API_KEY is required'),
  POLYGON_API_KEY: z.string().min(1, 'POLYGON_API_KEY is required'),
  // Ak používaš SQLite, povoľ aj file:
  DATABASE_URL: z
    .string()
    .refine(
      (v) => v.startsWith('file:') || /^.+:\/\/.+/.test(v),
      'Valid DATABASE_URL is required'
    ),
  // Optional fields
  REDIS_URL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  QUEUE_REDIS_HOST: z.string().optional(),
  QUEUE_REDIS_PORT: z.string().optional(),
  QUEUE_REDIS_PASSWORD: z.string().optional(),
  WS_PORT: z.string().optional(),
  DATADOG_API_KEY: z.string().optional(),
  NEW_RELIC_LICENSE_KEY: z.string().optional(),
})

export type Env = z.infer<typeof EnvSchema>

// ✅ prísna validácia (runtime)
export function parseEnvStrict(env: NodeJS.ProcessEnv): Env {
  const out = EnvSchema.parse(env)
  return out
}

// ✅ mäkká validácia (build) – neháže, len varuje
export function parseEnvSoft(env: NodeJS.ProcessEnv): Partial<Env> {
  const res = EnvSchema.partial().safeParse(env)
  if (!res.success) {
    console.warn(
      '[ENV] Skipping strict validation during build:',
      res.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    )
    return env as any
  }
  return res.data
}

// Backward compatibility
export function validateEnv() {
  return parseEnvStrict(process.env)
}

export type ValidatedEnv = Env

// Export validated env (call this in app startup)
// Only validate on server side, not in browser
export const env = typeof window === 'undefined' ? validateEnv() : {} as Env
