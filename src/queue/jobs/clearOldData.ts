import { PrismaClient } from '@prisma/client'
import { getTodayDate, setDailyResetState } from '@/lib/daily-reset-state'

const prisma = new PrismaClient()

/**
 * Reset current day data - clears all data for today
 * Useful for manual resets or when cron job needs fresh start
 */
export async function resetCurrentDayData() {
  try {
    console.log('🔄 Starting reset of current day data...')
    
    // Get today's date using utility function
    const today = getTodayDate()
    
    console.log(`🗑️ Resetting all data for ${today.toISOString()}`)
    
    // Reset current day earnings data
    const resetTodayEarnings = await prisma.earningsTickersToday.deleteMany({
      where: {
        reportDate: {
          gte: today
        }
      }
    })
    
    // Reset current day market data
    const resetTodayMarket = await prisma.todayEarningsMovements.deleteMany({
      where: {
        reportDate: {
          gte: today
        }
      }
    })
    
    // Set daily reset state
    await setDailyResetState('RESET_DONE')
    
    console.log('✅ Current day reset completed successfully!')
    console.log(`📊 Reset records:`)
    console.log(`   - Today's earnings: ${resetTodayEarnings.count}`)
    console.log(`   - Today's market data: ${resetTodayMarket.count}`)
    
    return {
      success: true,
      reset: {
        earnings: resetTodayEarnings.count,
        market: resetTodayMarket.count
      }
    }
    
  } catch (error) {
    console.error('❌ Error during current day reset:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Cleanup job - removes old data to keep database clean
 * Runs daily to prevent database from growing indefinitely
 */
export async function clearOldData() {
  try {
    console.log('🧹 Starting cleanup of old data...')
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 7) // Keep only last 7 days
    
    // Get today's date using utility function
    const today = getTodayDate()
    
    console.log(`🗑️ Removing data older than ${cutoffDate.toISOString()}`)
    console.log(`🔄 Resetting current day data for ${today.toISOString()}`)
    
    // 1. Clean up old earnings data (older than 7 days)
    const deletedEarnings = await prisma.earningsTickersToday.deleteMany({
      where: {
        reportDate: {
          lt: cutoffDate
        }
      }
    })
    
    // 2. Clean up old market data (older than 7 days)
    const deletedMarket = await prisma.todayEarningsMovements.deleteMany({
      where: {
        reportDate: {
          lt: cutoffDate
        }
      }
    })
    
    // 3. Reset current day data to ensure fresh start
    const resetTodayEarnings = await prisma.earningsTickersToday.deleteMany({
      where: {
        reportDate: {
          gte: today
        }
      }
    })
    
    const resetTodayMarket = await prisma.todayEarningsMovements.deleteMany({
      where: {
        reportDate: {
          gte: today
        }
      }
    })
    
    // Clean up old historical earnings data (keep last 30 days)
    const historicalCutoff = new Date()
    historicalCutoff.setDate(historicalCutoff.getDate() - 30)

    // Note: Only clean tables that exist in current schema
    // benzingaGuidance and guidanceImportFailures tables were removed
    console.log('Note: Guidance tables cleanup skipped (tables do not exist in current schema)')
    
    // Set daily reset state
    await setDailyResetState('RESET_DONE')
    
    console.log('✅ Cleanup completed successfully!')
    console.log(`📊 Deleted records:`)
    console.log(`   - Old earnings: ${deletedEarnings.count}`)
    console.log(`   - Old market data: ${deletedMarket.count}`)
    console.log(`   - Reset today's earnings: ${resetTodayEarnings.count}`)
    console.log(`   - Reset today's market data: ${resetTodayMarket.count}`)
    
    return {
      success: true,
      deleted: {
        oldEarnings: deletedEarnings.count,
        oldMarket: deletedMarket.count,
        resetTodayEarnings: resetTodayEarnings.count,
        resetTodayMarket: resetTodayMarket.count
      }
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  const command = process.argv[2]
  
  if (command === 'reset') {
    resetCurrentDayData()
      .then((result) => {
        console.log('✅ Reset completed successfully!')
        console.log('Result:', result)
        process.exit(0)
      })
      .catch((error) => {
        console.error('❌ Reset failed:', error)
        process.exit(1)
      })
  } else {
    clearOldData()
      .then(result => {
        console.log('🎉 Cleanup job completed:', result)
        process.exit(0)
      })
      .catch(error => {
        console.error('💥 Cleanup job failed:', error)
        process.exit(1)
      })
  }
}
