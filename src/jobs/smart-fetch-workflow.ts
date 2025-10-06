#!/usr/bin/env tsx

/**
 * 🎯 SMART FETCH WORKFLOW - Inteligentný postupný fetch
 * 
 * Tento script:
 * 1. Zistí, ktoré tickery už majú market data
 * 2. Fetchne market data len pre chýbajúce tickery
 * 3. Filtruje malé firmy bez market cap
 * 4. Uloží len kvalitné dáta
 */

import { PrismaClient } from '@prisma/client'
import { UnifiedFetcherService } from '../modules/data-integration/services/unified-fetcher.service.js'
import { toReportDateUTC } from '../modules/shared/utils/date.utils'

const prisma = new PrismaClient()

async function main() {
  console.log('🎯 Starting SMART fetch workflow...')
  
  try {
    const date = new Date()
    const reportDate = toReportDateUTC(date)
    
    console.log(`📅 Processing date: ${reportDate.toISOString()}`)
    
    // 1. Zisti aktuálny stav
    const earningsCount = await prisma.earningsTickersToday.count()
    const marketDataCount = await prisma.marketData.count()
    
    console.log(`📊 Current state: ${earningsCount} earnings, ${marketDataCount} market data`)
    
    if (earningsCount === 0) {
      console.log('❌ No earnings data found. Run earnings fetch first.')
      process.exit(1)
    }
    
    // 2. Zisti, ktoré tickery už majú market data
    const existingMarketTickers = await prisma.marketData.findMany({
      select: { ticker: true }
    })
    
    const existingTickers = new Set(existingMarketTickers.map(m => m.ticker))
    console.log(`✅ Already have market data for: ${existingTickers.size} tickers`)
    
    // 3. Zisti, ktoré tickery potrebujú market data
    const allEarningsTickers = await prisma.earningsTickersToday.findMany({
      select: { ticker: true }
    })
    
    const missingTickers = allEarningsTickers
      .map(e => e.ticker)
      .filter(ticker => !existingTickers.has(ticker))
    
    console.log(`🔄 Need market data for: ${missingTickers.length} tickers`)
    console.log(`Missing tickers: ${missingTickers.join(', ')}`)
    
    if (missingTickers.length === 0) {
      console.log('✅ All tickers already have market data!')
      return
    }
    
    // 4. Fetch market data len pre chýbajúce tickery
    const fetcher = new UnifiedFetcherService()
    
    console.log('🔄 Fetching market data for missing tickers...')
    const marketData = await fetcher.fetchMarketDataForTickersSimple(missingTickers)
    
    console.log(`📊 Fetched data for ${Object.keys(marketData).length} tickers`)
    
    // 5. Filtruj malé firmy
    const filteredMarketData = fetcher.filterTickersWithMarketCap(marketData)
    const filteredCount = Object.keys(filteredMarketData).length
    const skippedCount = Object.keys(marketData).length - filteredCount
    
    console.log(`🎯 After filtering: ${filteredCount} tickers kept, ${skippedCount} skipped (no market cap)`)
    
    if (skippedCount > 0) {
      const skippedTickers = Object.keys(marketData).filter(ticker => !filteredMarketData[ticker])
      console.log(`❌ Skipped tickers: ${skippedTickers.join(', ')}`)
    }
    
    // 6. Ulož market data
    if (Object.keys(filteredMarketData).length > 0) {
      const marketResult = await fetcher.saveMarketData(filteredMarketData, reportDate)
      
      console.log(`💾 Market data saved: ${marketResult.ok} successful, ${marketResult.failed} failed`)
      
      if (marketResult.errors.length > 0) {
        console.log('❌ Errors:')
        marketResult.errors.forEach(error => console.log(`  ${error.ticker}: ${error.reason}`))
      }
    }
    
    // 7. Finálny stav
    const finalMarketCount = await prisma.marketData.count()
    console.log(`\n🎉 Final state: ${earningsCount} earnings, ${finalMarketCount} market data`)
    
    console.log('✅ Smart fetch workflow completed successfully!')
    
  } catch (error) {
    console.error('❌ Smart fetch workflow failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
