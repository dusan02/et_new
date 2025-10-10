#!/usr/bin/env tsx

/**
 * 🔍 Debug Next.js Environment
 * Test to see what environment Next.js is actually using
 */

console.log('🔍 [DEBUG-NEXTJS] Environment variables:')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('DATABASE_URL:', process.env.DATABASE_URL)
console.log('POLYGON_API_KEY:', process.env.POLYGON_API_KEY ? 'SET' : 'NOT SET')
console.log('FINNHUB_API_KEY:', process.env.FINNHUB_API_KEY ? 'SET' : 'NOT SET')

// Test if we can load the API route
import('../src/app/api/earnings/route').then(({ GET }) => {
  console.log('✅ [DEBUG-NEXTJS] API route loaded successfully')
}).catch((error) => {
  console.error('❌ [DEBUG-NEXTJS] Failed to load API route:', error)
})
