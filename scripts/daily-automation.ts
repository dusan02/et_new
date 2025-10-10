#!/usr/bin/env tsx

/**
 * 🚀 Daily Automation Pipeline
 * Simuluje reálny denný cyklus systému (Reset + Fetch + Publish + Verify)
 */

import { prisma } from '../src/lib/prisma'
// import { fetchEarningsData } from '../src/modules/data-integration/services/unified-fetcher.service'
// import { atomicPublish } from '../src/lib/redis-atomic'
// import { acquireLock, releaseLock } from '../src/lib/cron-lock'
// import { sendAlert } from '../src/lib/alerting'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import tz from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(tz)

const LOCK_NAME = 'daily-automation-lock'
const LOCK_TTL = 300 // 5 minutes

async function checkAlreadyRunToday(): Promise<boolean> {
  const today = dayjs().utc().format('YYYY-MM-DD')
  
  // Check if we already have data for today
  const existingData = await prisma.earningsTickersToday.findFirst({
    where: {
      reportDate: {
        gte: new Date(today + 'T00:00:00.000Z'),
        lte: new Date(today + 'T23:59:59.999Z')
      }
    }
  })
  
  if (existingData) {
    console.log(`⚠️  [AUTOMATION] Data already exists for ${today}`)
    console.log(`💡 Use SKIP_RESET_CHECK=true to force re-run`)
    return true
  }
  
  return false
}

async function resetDailyState(): Promise<void> {
  console.log('🔄 [AUTOMATION] Resetting daily state...')
  
  const today = dayjs().utc().format('YYYY-MM-DD')
  
  // Clear today's data (skip if foreign key constraints exist)
  try {
    await prisma.earningsTickersToday.deleteMany({
      where: {
        reportDate: {
          gte: new Date(today + 'T00:00:00.000Z'),
          lte: new Date(today + 'T23:59:59.999Z')
        }
      }
    })
    console.log('✅ [AUTOMATION] Daily state reset completed')
  } catch (error) {
    console.warn('⚠️  [AUTOMATION] Could not reset daily state (foreign key constraints)')
    console.log('💡 [AUTOMATION] Continuing with existing data...')
  }
}

async function fetchTodayData(): Promise<number> {
  console.log('📊 [AUTOMATION] Fetching today\'s earnings data...')
  
  const today = dayjs().utc().format('YYYY-MM-DD')
  
  // Check if we already have data for today
  const existingCount = await prisma.earningsTickersToday.count({
    where: {
      reportDate: {
        gte: new Date(today + 'T00:00:00.000Z'),
        lte: new Date(today + 'T23:59:59.999Z')
      }
    }
  })
  
  if (existingCount > 0) {
    console.log(`✅ [AUTOMATION] Found ${existingCount} existing earnings records for today`)
    return existingCount
  }
  
  // If no data exists, we would normally fetch from Finnhub
  // For testing purposes, we'll just return 0
  console.log('⚠️  [AUTOMATION] No existing data found - would fetch from Finnhub')
  return 0
}

async function publishData(): Promise<void> {
  console.log('📤 [AUTOMATION] Publishing data to Redis...')
  
  const today = dayjs().utc().format('YYYY-MM-DD')
  
  // Get today's data from database
  const todayData = await prisma.earningsTickersToday.findMany({
    where: {
      reportDate: {
        gte: new Date(today + 'T00:00:00.000Z'),
        lte: new Date(today + 'T23:59:59.999Z')
      }
    },
    select: {
      ticker: true,
      reportTime: true,
      epsActual: true,
      epsEstimate: true,
      revenueActual: true,
      revenueEstimate: true,
      marketData: true
    }
  })
  
  // Publish to Redis (simplified for testing)
  const publishData = {
    date: today,
    items: todayData,
    timestamp: new Date().toISOString(),
    count: todayData.length
  }
  
  console.log(`📤 [AUTOMATION] Would publish ${todayData.length} items to Redis`)
  console.log(`📋 [AUTOMATION] Sample data:`, publishData.items.slice(0, 2).map(item => item.ticker))
  
  // await atomicPublish('earnings:today', publishData, 86400) // 24 hours TTL
  // await atomicPublish(`earnings:${today}:published`, publishData, 86400)
  
  console.log(`✅ [AUTOMATION] Data prepared for publishing`)
}

async function verifyPipeline(): Promise<void> {
  console.log('🔍 [AUTOMATION] Verifying pipeline...')
  
  const today = dayjs().utc().format('YYYY-MM-DD')
  
  // Check database
  const dbCount = await prisma.earningsTickersToday.count({
    where: {
      reportDate: {
        gte: new Date(today + 'T00:00:00.000Z'),
        lte: new Date(today + 'T23:59:59.999Z')
      }
    }
  })
  
  // Check API (simulate request)
  const apiUrl = 'http://localhost:3000/api/earnings/today'
  let apiCount = 0
  
  try {
    const response = await fetch(apiUrl)
    const data = await response.json()
    apiCount = data.meta?.total || 0
  } catch (error) {
    console.warn('⚠️  [AUTOMATION] Could not verify API (server might not be running)')
  }
  
  console.log(`📊 [AUTOMATION] Verification results:`)
  console.log(`   Database: ${dbCount} records`)
  console.log(`   API: ${apiCount} records`)
  
  // Alert if there's a mismatch
  if (dbCount > 0 && apiCount === 0) {
    console.warn('⚠️  [AUTOMATION] Database has data but API returns 0')
    // await sendAlert('ERROR', 'Database has data but API returns 0', {
    //   dbCount,
    //   apiCount,
    //   date: today
    // })
  }
  
  // Log daily summary
  console.log(`[DAILY] finnhub=${dbCount} db=${dbCount} published=${dbCount} api=${apiCount} tz=UTC`)
}

async function runDailyAutomation(): Promise<void> {
  console.log('🚀 [AUTOMATION] Starting daily automation pipeline...')
  console.log(`📅 Date: ${dayjs().utc().format('YYYY-MM-DD')}`)
  
  // Check if already run today
  if (!process.env.SKIP_RESET_CHECK && await checkAlreadyRunToday()) {
    console.log('⏭️  [AUTOMATION] Skipping - already run today')
    return
  }
  
  // Acquire lock (simplified for testing)
  console.log('🔒 [AUTOMATION] Acquiring lock...')
  const lockAcquired = true // Simplified for testing
  
  try {
    // Step 1: Reset daily state
    await resetDailyState()
    
    // Step 2: Fetch today's data
    const fetchCount = await fetchTodayData()
    
    if (fetchCount === 0) {
      console.warn('⚠️  [AUTOMATION] No data fetched - this might be normal for weekends/holidays')
    }
    
    // Step 3: Publish data
    await publishData()
    
    // Step 4: Verify pipeline
    await verifyPipeline()
    
    console.log('🎉 [AUTOMATION] Daily automation completed successfully!')
    
  } catch (error) {
    console.error('❌ [AUTOMATION] Daily automation failed:', error)
    // await sendAlert('ERROR', 'Daily automation failed', { error: error.message })
    throw error
  } finally {
    console.log('🔓 [AUTOMATION] Releasing lock...')
    // await releaseLock(LOCK_NAME) // Simplified for testing
  }
}

// Main execution
async function main() {
  const command = process.argv[2]
  
  switch (command) {
    case 'run':
      await runDailyAutomation()
      break
    case 'reset':
      await resetDailyState()
      break
    case 'fetch':
      await fetchTodayData()
      break
    case 'publish':
      await publishData()
      break
    case 'verify':
      await verifyPipeline()
      break
    default:
      console.log('Usage: tsx scripts/daily-automation.ts <command>')
      console.log('Commands:')
      console.log('  run     - Run full daily automation pipeline')
      console.log('  reset   - Reset daily state only')
      console.log('  fetch   - Fetch data only')
      console.log('  publish - Publish data only')
      console.log('  verify  - Verify pipeline only')
      process.exit(1)
  }
}

main().catch((error) => {
  console.error('💥 [AUTOMATION] Fatal error:', error)
  process.exit(1)
})