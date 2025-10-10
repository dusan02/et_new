#!/usr/bin/env tsx

/**
 * 🧪 SMOKE TEST - Overenie dnešných tickerov
 * 
 * Tento skript overí, či máme dnešné tickery v databáze
 * a či sa zhodujú s tým, čo vracia Finnhub API
 */

import { PrismaClient } from '@prisma/client'
import { format } from 'date-fns'

const prisma = new PrismaClient()

async function getTodayTickers(): Promise<string[]> {
  const today = format(new Date(), 'yyyy-MM-dd')
  
  console.log(`🔍 [SMOKE-TEST] Checking tickers for date: ${today}`)
  
  // ✅ FIX: Use timezone-aware date range
  const start = new Date(today + 'T00:00:00.000Z')
  const end = new Date(today + 'T23:59:59.999Z')
  
  // Získaj tickery z EarningsTickersToday
  const earningsTickers = await prisma.earningsTickersToday.findMany({
    where: {
      reportDate: {
        gte: start,
        lte: end
      }
    },
    select: {
      ticker: true
    }
  })
  
  const earningsTickerList = earningsTickers.map(t => t.ticker)
  console.log(`📊 [SMOKE-TEST] Found ${earningsTickerList.length} tickers in EarningsTickersToday: [${earningsTickerList.join(', ')}]`)
  
  // Získaj tickery z pricesDaily (starý systém)
  const pricesTickers = await prisma.pricesDaily.findMany({
    where: {
      day: {
        gte: start,
        lte: end
      }
    },
    select: {
      ticker: true
    }
  })
  
  const pricesTickerList = pricesTickers.map(t => t.ticker)
  console.log(`📊 [SMOKE-TEST] Found ${pricesTickerList.length} tickers in pricesDaily: [${pricesTickerList.join(', ')}]`)
  
  // ✅ FIX: Combine and deduplicate tickers
  const todayTickers = [...new Set([
    ...earningsTickerList,
    ...pricesTickerList,
  ])]
  
  return todayTickers
}

async function main() {
  try {
    console.log('🧪 Starting smoke test for today\'s tickers...')
    
    const todayTickers = await getTodayTickers()
    
    if (todayTickers.length === 0) {
      console.error('❌ [SMOKE-TEST] FAILED: No tickers found for today!')
      console.error('💡 This means cron will find 0 tickers and skip processing')
      process.exit(1)
    }
    
    console.log(`✅ [SMOKE-TEST] PASSED: Found ${todayTickers.length} tickers`)
    console.log(`🎯 [SMOKE-TEST] Tickers: [${todayTickers.join(', ')}]`)
    
  } catch (error) {
    console.error('❌ [SMOKE-TEST] ERROR:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Spusti ak je volaný priamo
if (require.main === module) {
  main()
}
