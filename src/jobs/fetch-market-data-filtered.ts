#!/usr/bin/env tsx

/**
 * 🎯 OPTIMIZED MARKET DATA FETCH - Only processes tickers with earnings
 * This is the second step in the optimized workflow:
 * 1. Get tickers from earnings table
 * 2. Fetch market data only for those tickers
 * 3. Filter out tickers without market cap
 * 4. Save to database
 */

import { PrismaClient } from '@prisma/client'
import { UnifiedDataFetcher } from '../modules/data-integration/services/unified-fetcher.service.js'
import { toReportDateUTC } from '../modules/shared/utils/date.utils.js'

const prisma = new PrismaClient()

async function main() {
  console.log('🎯 Starting OPTIMIZED market data fetch (filtered)...')
  
  try {
    const date = new Date()
    const reportDate = toReportDateUTC(date)
    
    console.log(`📅 Fetching market data for date: ${reportDate.toISOString()}`)
    
    // Get tickers from earnings table for today
    const earningsTickers = await prisma.earningsTickersToday.findMany({
      where: {
        reportDate: reportDate
      },
      select: {
        ticker: true
      }
    })
    
    const tickers = earningsTickers.map(e => e.ticker)
    console.log(`📊 Found ${tickers.length} tickers with earnings to process`)
    
    if (tickers.length === 0) {
      console.log('⚠️ No earnings tickers found, skipping market data fetch')
      return {
        success: true,
        marketCount: 0,
        filteredCount: 0,
        skippedCount: 0
      }
    }
    
    // Initialize the unified fetcher
    const fetcher = new UnifiedDataFetcher()
    
    // Fetch market data ONLY for tickers with earnings
    const result = await fetcher.fetchMarketDataForTickers(tickers, date)
    
    console.log('✅ Market data fetch completed!')
    console.log(`📊 Results: Market=${result.marketCount}, Filtered=${result.filteredCount}, Skipped=${result.skippedCount}`)
    
    return {
      success: true,
      marketCount: result.marketCount,
      filteredCount: result.filteredCount,
      skippedCount: result.skippedCount
    }
    
  } catch (error) {
    console.error('❌ Market data fetch failed:', error)
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
        console.log('🎉 Market data fetch completed successfully!')
        process.exit(0)
      } else {
        console.error('💥 Market data fetch failed!')
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('💥 Unexpected error:', error)
      process.exit(1)
    })
}

export { main }
