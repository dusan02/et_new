#!/usr/bin/env tsx

/**
 * 🎯 OPTIMIZED EARNINGS FETCH - Only fetches earnings data, no market data
 * This is the first step in the optimized workflow:
 * 1. Fetch earnings from Finnhub
 * 2. Save to database
 * 3. Later, market data fetch will only process tickers that have earnings
 */

import { PrismaClient } from '@prisma/client'
import { UnifiedDataFetcher } from '../modules/data-integration/services/unified-fetcher.service.js'
import { toReportDateUTC } from '../modules/shared/utils/date.utils.js'

const prisma = new PrismaClient()

async function main() {
  console.log('🎯 Starting OPTIMIZED earnings-only fetch...')
  
  try {
    const date = new Date()
    const reportDate = toReportDateUTC(date)
    
    console.log(`📅 Fetching earnings for date: ${reportDate.toISOString()}`)
    
    // Initialize the unified fetcher
    const fetcher = new UnifiedDataFetcher()
    
    // Fetch ONLY earnings data (no market data)
    const result = await fetcher.fetchEarningsOnly(date)
    
    console.log('✅ Earnings-only fetch completed!')
    console.log(`📊 Results: Earnings=${result.earningsCount}, Tickers=${result.tickersCount}`)
    
    return {
      success: true,
      earningsCount: result.earningsCount,
      tickersCount: result.tickersCount
    }
    
  } catch (error) {
    console.error('❌ Earnings-only fetch failed:', error)
    process.exitCode = 1
    return {
      success: false,
      error: error.message
    }
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then((result) => {
      if (result.success) {
        console.log('🎉 Earnings-only fetch completed successfully!')
        process.exit(0)
      } else {
        console.error('💥 Earnings-only fetch failed!')
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('💥 Unexpected error:', error)
      process.exit(1)
    })
}

export { main }
