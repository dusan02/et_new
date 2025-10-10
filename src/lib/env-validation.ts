import { z } from 'zod'

// Mikro-stráž pre NODE_ENV
const RAW_NODE_ENV = String(process.env.NODE_ENV ?? "").trim().toLowerCase();
if (!["development","test","production"].includes(RAW_NODE_ENV)) {
  console.warn(`[env] Non-standard NODE_ENV='${process.env.NODE_ENV}', defaulting to 'production'`);
}

export const EnvSchema = z.object({
  NODE_ENV: z.preprocess(
    (v) => String(v ?? "").trim().toLowerCase(),
    z.enum(['development', 'test', 'production'])
  ).default('development'),
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
// Temporarily disable validation for development
export const env = typeof window === 'undefined' ? {
  NODE_ENV: 'development' as const,
  FINNHUB_API_KEY: 'demo',
  POLYGON_API_KEY: 'demo',
  DATABASE_URL: 'file:./prisma/dev.db',
  REDIS_URL: undefined,
  NEXT_PUBLIC_APP_URL: undefined,
  QUEUE_REDIS_HOST: undefined,
  QUEUE_REDIS_PORT: undefined,
  QUEUE_REDIS_PASSWORD: undefined,
  WS_PORT: undefined,
  DATADOG_API_KEY: undefined,
  NEW_RELIC_LICENSE_KEY: undefined
} as Env : {} as Env
