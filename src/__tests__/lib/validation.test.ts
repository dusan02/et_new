/**
 * 🛡️ Validation Tests
 * Tests for input validation and rate limiting
 */

import { 
  validateQuery, 
  validateRequest,
  checkRateLimit,
  earningsQuerySchema,
  statsQuerySchema,
  clearCacheSchema
} from '@/lib/validation'
import { NextRequest } from 'next/server'

describe('Input Validation', () => {
  describe('earningsQuerySchema', () => {
    it('validates correct parameters', () => {
      const params = new URLSearchParams({
        date: '2025-01-15',
        ticker: 'AAPL',
        limit: '100',
        offset: '0',
        sector: 'Technology',
        reportTime: 'AMC'
      })

      const result = validateQuery(earningsQuerySchema, params)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.date).toBe('2025-01-15')
        expect(result.data.ticker).toBe('AAPL')
        expect(result.data.limit).toBe(100)
        expect(result.data.offset).toBe(0)
        expect(result.data.sector).toBe('Technology')
        expect(result.data.reportTime).toBe('AMC')
      }
    })

    it('applies default values correctly', () => {
      const params = new URLSearchParams()
      
      const result = validateQuery(earningsQuerySchema, params)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(100)
        expect(result.data.offset).toBe(0)
      }
    })

    it('rejects invalid date format', () => {
      const params = new URLSearchParams({
        date: '2025/01/15' // Wrong format
      })

      const result = validateQuery(earningsQuerySchema, params)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Date must be in YYYY-MM-DD format')
      }
    })

    it('rejects invalid ticker format', () => {
      const params = new URLSearchParams({
        ticker: 'aapl' // Should be uppercase
      })

      const result = validateQuery(earningsQuerySchema, params)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Ticker must be 1-10 uppercase letters')
      }
    })

    it('rejects ticker that is too long', () => {
      const params = new URLSearchParams({
        ticker: 'VERYLONGTICKER' // Too long
      })

      const result = validateQuery(earningsQuerySchema, params)
      
      expect(result.success).toBe(false)
    })

    it('rejects limit that is too high', () => {
      const params = new URLSearchParams({
        limit: '5000' // Exceeds max of 1000
      })

      const result = validateQuery(earningsQuerySchema, params)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Limit cannot exceed 1000')
      }
    })

    it('rejects negative offset', () => {
      const params = new URLSearchParams({
        offset: '-10'
      })

      const result = validateQuery(earningsQuerySchema, params)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Offset must be non-negative')
      }
    })

    it('rejects invalid report time', () => {
      const params = new URLSearchParams({
        reportTime: 'INVALID'
      })

      const result = validateQuery(earningsQuerySchema, params)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Report time must be BMO, AMC, or TNS')
      }
    })
  })

  describe('statsQuerySchema', () => {
    it('validates correct parameters', () => {
      const params = new URLSearchParams({
        date: '2025-01-15',
        period: 'week'
      })

      const result = validateQuery(statsQuerySchema, params)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.date).toBe('2025-01-15')
        expect(result.data.period).toBe('week')
      }
    })

    it('applies default period', () => {
      const params = new URLSearchParams()
      
      const result = validateQuery(statsQuerySchema, params)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.period).toBe('today')
      }
    })

    it('rejects invalid period', () => {
      const params = new URLSearchParams({
        period: 'invalid'
      })

      const result = validateQuery(statsQuerySchema, params)
      
      expect(result.success).toBe(false)
    })
  })

  describe('clearCacheSchema', () => {
    it('validates cache clear parameters', () => {
      const params = new URLSearchParams({
        key: 'earnings-2025-01-15',
        all: 'true'
      })

      const result = validateQuery(clearCacheSchema, params)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.key).toBe('earnings-2025-01-15')
        expect(result.data.all).toBe(true)
      }
    })

    it('rejects cache key that is too long', () => {
      const params = new URLSearchParams({
        key: 'a'.repeat(101) // Too long
      })

      const result = validateQuery(clearCacheSchema, params)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Cache key too long')
      }
    })
  })

  describe('validateRequest', () => {
    it('validates NextRequest correctly', () => {
      const request = new NextRequest('http://localhost:3000/api/earnings?date=2025-01-15&ticker=AAPL')
      
      const result = validateRequest(earningsQuerySchema, request)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.date).toBe('2025-01-15')
        expect(result.data.ticker).toBe('AAPL')
      }
    })

    it('formats validation errors nicely', () => {
      const request = new NextRequest('http://localhost:3000/api/earnings?date=invalid&limit=5000')
      
      const result = validateRequest(earningsQuerySchema, request)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Validation failed')
        expect(result.error.details).toBeInstanceOf(Array)
        expect(result.error.details.length).toBeGreaterThan(0)
      }
    })
  })
})

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear rate limit cache before each test
    jest.clearAllMocks()
  })

  it('allows requests within rate limit', () => {
    const ip = '192.168.1.1'
    
    // Should allow first 60 requests
    for (let i = 0; i < 60; i++) {
      expect(checkRateLimit(ip, 60, 60000)).toBe(true)
    }
  })

  it('blocks requests that exceed rate limit', () => {
    const ip = '192.168.1.2'
    
    // Fill up the rate limit
    for (let i = 0; i < 60; i++) {
      checkRateLimit(ip, 60, 60000)
    }
    
    // 61st request should be blocked
    expect(checkRateLimit(ip, 60, 60000)).toBe(false)
  })

  it('resets rate limit after time window', () => {
    const ip = '192.168.1.3'
    const windowMs = 100 // 100ms window for testing
    
    // Fill up the rate limit
    for (let i = 0; i < 5; i++) {
      checkRateLimit(ip, 5, windowMs)
    }
    
    // Should be blocked
    expect(checkRateLimit(ip, 5, windowMs)).toBe(false)
    
    // Wait for window to reset
    return new Promise(resolve => {
      setTimeout(() => {
        // Should allow requests again
        expect(checkRateLimit(ip, 5, windowMs)).toBe(true)
        resolve(void 0)
      }, windowMs + 10)
    })
  })

  it('handles different IPs independently', () => {
    const ip1 = '192.168.1.4'
    const ip2 = '192.168.1.5'
    
    // Fill up rate limit for ip1
    for (let i = 0; i < 60; i++) {
      checkRateLimit(ip1, 60, 60000)
    }
    
    // ip1 should be blocked
    expect(checkRateLimit(ip1, 60, 60000)).toBe(false)
    
    // ip2 should still be allowed
    expect(checkRateLimit(ip2, 60, 60000)).toBe(true)
  })

  it('handles custom rate limits', () => {
    const ip = '192.168.1.6'
    
    // Custom limit of 5 requests
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(ip, 5, 60000)).toBe(true)
    }
    
    // 6th request should be blocked
    expect(checkRateLimit(ip, 5, 60000)).toBe(false)
  })
})
