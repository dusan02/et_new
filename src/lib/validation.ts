import { z } from 'zod'
import { NextRequest } from 'next/server'

// Common validation patterns
const tickerPattern = /^[A-Z]{1,10}$/
const datePattern = /^\d{4}-\d{2}-\d{2}$/

// Schema pre earnings API GET requests
export const earningsQuerySchema = z.object({
  date: z.string().regex(datePattern, 'Date must be in YYYY-MM-DD format').optional(),
  ticker: z.string().regex(tickerPattern, 'Ticker must be 1-10 uppercase letters').optional(),
  limit: z.coerce.number().min(1, 'Limit must be at least 1').max(1000, 'Limit cannot exceed 1000').default(100),
  offset: z.coerce.number().min(0, 'Offset must be non-negative').default(0),
  sector: z.string().max(50, 'Sector name too long').optional(),
  reportTime: z.enum(['BMO', 'AMC', 'TNS']).optional()
})

// Schema pre stats API
export const statsQuerySchema = z.object({
  date: z.string().regex(datePattern, 'Date must be in YYYY-MM-DD format').optional(),
  period: z.enum(['today', 'week', 'month']).default('today')
})

// Schema pre cache management
export const clearCacheSchema = z.object({
  key: z.string().max(100, 'Cache key too long').optional(),
  all: z.coerce.boolean().default(false),
  pattern: z.string().max(50, 'Pattern too long').optional()
})

// Schema pre rate limiting
export const rateLimitSchema = z.object({
  ip: z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^[a-f0-9:]+$|^unknown$/, 'Invalid IP address'),
  endpoint: z.string().max(100, 'Endpoint path too long'),
  userAgent: z.string().max(500, 'User agent too long').optional()
})

// Helper funkcie pre validáciu
export function validateQuery<T>(schema: z.ZodSchema<T>, searchParams: URLSearchParams) {
  const params = Object.fromEntries(searchParams.entries())
  
  try {
    return {
      success: true as const,
      data: schema.parse(params)
    }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof z.ZodError ? error.issues : 'Validation failed'
    }
  }
}

// Validate request with better error formatting (without using request.url to avoid dynamic server usage)
export function validateRequest<T>(schema: z.ZodSchema<T>, request: NextRequest) {
  // Use request.nextUrl.searchParams instead of new URL(request.url) to avoid dynamic server usage
  const validation = validateQuery(schema, request.nextUrl.searchParams)
  
  if (!validation.success) {
    const formattedErrors = Array.isArray(validation.error) 
      ? validation.error.map(err => `${err.path.join('.')}: ${err.message}`)
      : [String(validation.error)]
    
    return {
      success: false as const,
      error: {
        message: 'Validation failed',
        details: formattedErrors
      }
    }
  }
  
  return {
    success: true as const,
    data: validation.data
  }
}

// Rate limiting helper
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(ip: string, maxRequests: number = 60, windowMs: number = 60000): boolean {
  const now = Date.now()
  const key = ip
  
  const current = requestCounts.get(key)
  
  if (!current || now > current.resetTime) {
    // Reset or initialize
    requestCounts.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (current.count >= maxRequests) {
    return false // Rate limit exceeded
  }
  
  current.count++
  return true
}

// Type safety exports
export type EarningsQuery = z.infer<typeof earningsQuerySchema>
export type StatsQuery = z.infer<typeof statsQuerySchema>
export type ClearCacheQuery = z.infer<typeof clearCacheSchema>
export type RateLimitQuery = z.infer<typeof rateLimitSchema>
