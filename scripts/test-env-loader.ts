#!/usr/bin/env tsx

/**
 * 🧪 Test Environment Loader
 * Test the centralized env loader
 */

console.log('🧪 Testing environment loader...')

import('../src/lib/env').then(({ env }) => {
  console.log('✅ [ENV-TEST] Environment loaded successfully')
  console.log('NODE_ENV:', env.NODE_ENV)
  console.log('DATABASE_URL:', env.DATABASE_URL ? 'SET' : 'NOT SET')
  console.log('FINNHUB_API_KEY:', env.FINNHUB_API_KEY ? 'SET' : 'NOT SET')
  console.log('POLYGON_API_KEY:', env.POLYGON_API_KEY ? 'SET' : 'NOT SET')
}).catch((error) => {
  console.error('❌ [ENV-TEST] Failed to load environment:', error)
})
