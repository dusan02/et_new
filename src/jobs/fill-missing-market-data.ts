#!/usr/bin/env tsx

/**
 * 🎯 FILL MISSING MARKET DATA - Jednoduchý script na doplnenie chýbajúcich market dát
 * 
 * Tento script:
 * 1. Zistí, ktoré tickery už majú market data
 * 2. Spustí fetch len pre chýbajúce tickery
 * 3. Filtruje malé firmy bez market cap
 */

import { PrismaClient } from '@prisma/client'
import { toReportDateUTC } from '../modules/shared/utils/date.utils'

const prisma = new PrismaClient()

async function main() {
  console.log('🎯 Starting FILL MISSING MARKET DATA...')
  
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
    
    // 4. Spusti fetch script s filtrom len pre chýbajúce tickery
    console.log('🔄 Running fetch script for missing tickers...')
    
    // Použijeme existujúci fetch script, ale s filtrom
    const { spawn } = require('child_process')
    const path = require('path')
    
    const fetchScript = path.join(__dirname, 'fetch-today.ts')
    
    const child = spawn('npx', ['tsx', fetchScript], {
      cwd: path.join(__dirname, '../..'),
      env: {
        ...process.env,
        FILTER_TICKERS: missingTickers.join(','), // Custom filter
        SKIP_RESET_CHECK: 'true'
      },
      stdio: 'inherit'
    })
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Fetch completed successfully!')
        
        // 5. Skontroluj finálny stav
        checkFinalState()
      } else {
        console.error(`❌ Fetch failed with code ${code}`)
        process.exit(1)
      }
    })
    
  } catch (error) {
    console.error('❌ Fill missing market data failed:', error)
    process.exit(1)
  }
}

async function checkFinalState() {
  try {
    const earningsCount = await prisma.earningsTickersToday.count()
    const marketDataCount = await prisma.marketData.count()
    
    console.log(`\n🎉 Final state: ${earningsCount} earnings, ${marketDataCount} market data`)
    
    // Zisti, koľko tickerov má market cap
    const marketData = await prisma.marketData.findMany({
      select: { ticker: true, marketCap: true }
    })
    
    const withMarketCap = marketData.filter(m => m.marketCap && m.marketCap > 0)
    const withoutMarketCap = marketData.filter(m => !m.marketCap || m.marketCap <= 0)
    
    console.log(`🎯 Market cap analysis:`)
    console.log(`With market cap: ${withMarketCap.length}`)
    console.log(`Without market cap: ${withoutMarketCap.length}`)
    
    if (withoutMarketCap.length > 0) {
      console.log(`❌ Tickers without market cap: ${withoutMarketCap.map(m => m.ticker).join(', ')}`)
    }
    
    console.log('✅ Fill missing market data completed successfully!')
    
  } catch (error) {
    console.error('❌ Error checking final state:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
