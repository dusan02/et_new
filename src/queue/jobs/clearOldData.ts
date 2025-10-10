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
    
    // Reset current day market data first (due to foreign key constraints)
    const resetTodayMarket = await prisma.marketData.deleteMany({
      where: {
        reportDate: {
          gte: today
        }
      }
    })
    
    // Reset current day earnings data
    const resetTodayEarnings = await prisma.earningsTickersToday.deleteMany({
      where: {
        reportDate: {
          gte: today
        }
      }
    })
    
    // Reset current day movements data
    const resetTodayMovements = await prisma.todayEarningsMovements.deleteMany({
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
    console.log(`   - Today's market data: ${resetTodayMarket.count}`)
    console.log(`   - Today's earnings: ${resetTodayEarnings.count}`)
    console.log(`   - Today's movements: ${resetTodayMovements.count}`)
    
    return {
      success: true,
      reset: {
        market: resetTodayMarket.count,
        earnings: resetTodayEarnings.count,
        movements: resetTodayMovements.count
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
    console.log(`✅ Preserving today's data: ${today.toISOString()}`)
    
    // 1. Clean up old market data first (older than 7 days) - due to foreign key constraints
    const deletedMarket = await prisma.marketData.deleteMany({
      where: {
        reportDate: {
          lt: cutoffDate
        }
      }
    })
    
    // 2. Clean up old earnings data (older than 7 days)
    const deletedEarnings = await prisma.earningsTickersToday.deleteMany({
      where: {
        reportDate: {
          lt: cutoffDate
        }
      }
    })
    
    // 3. Clean up old movements data (older than 7 days)
    const deletedMovements = await prisma.todayEarningsMovements.deleteMany({
      where: {
        reportDate: {
          lt: cutoffDate
        }
      }
    })
    
    // 4. ✅ Safe cleanup: delete ONLY older data (not today)
    const cleanupYesterdayMarket = await prisma.marketData.deleteMany({
      where: {
        reportDate: {
          lt: today
        }
      }
    })
    
    const cleanupYesterdayEarnings = await prisma.earningsTickersToday.deleteMany({
      where: {
        reportDate: {
          lt: today
        }
      }
    })
    
    const cleanupYesterdayMovements = await prisma.todayEarningsMovements.deleteMany({
      where: {
        reportDate: {
          lt: today
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
    console.log(`   - Old market data (>7d): ${deletedMarket.count}`)
    console.log(`   - Old earnings (>7d): ${deletedEarnings.count}`)
    console.log(`   - Old movements (>7d): ${deletedMovements.count}`)
    console.log(`   - Yesterday market data: ${cleanupYesterdayMarket.count}`)
    console.log(`   - Yesterday earnings: ${cleanupYesterdayEarnings.count}`)
    console.log(`   - Yesterday movements: ${cleanupYesterdayMovements.count}`)
    console.log(`   ✅ Today's data PRESERVED (not deleted)`)
    
    return {
      success: true,
      deleted: {
        oldMarket: deletedMarket.count,
        oldEarnings: deletedEarnings.count,
        oldMovements: deletedMovements.count,
        yesterdayMarket: cleanupYesterdayMarket.count,
        yesterdayEarnings: cleanupYesterdayEarnings.count,
        yesterdayMovements: cleanupYesterdayMovements.count
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
