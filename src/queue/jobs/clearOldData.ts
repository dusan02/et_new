import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Cleanup job - removes old data to keep database clean
 * Runs daily to prevent database from growing indefinitely
 */
export async function clearOldData() {
  try {
    console.log('🧹 Starting cleanup of old data...')
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 7) // Keep only last 7 days
    
    console.log(`🗑️ Removing data older than ${cutoffDate.toISOString()}`)
    
    // Clean up old earnings data
    const deletedEarnings = await prisma.earningsTickersToday.deleteMany({
      where: {
        reportDate: {
          lt: cutoffDate
        }
      }
    })
    
    // Clean up old market data
    const deletedMarket = await prisma.todayEarningsMovements.deleteMany({
      where: {
        reportDate: {
          lt: cutoffDate
        }
      }
    })
    
    // Clean up old historical earnings data (keep last 30 days)
    const historicalCutoff = new Date()
    historicalCutoff.setDate(historicalCutoff.getDate() - 30)

    // Note: Only clean tables that exist in current schema
    // benzingaGuidance and guidanceImportFailures tables were removed
    console.log('Note: Guidance tables cleanup skipped (tables do not exist in current schema)')
    
    console.log('✅ Cleanup completed successfully!')
    console.log(`📊 Deleted records:`)
    console.log(`   - Earnings: ${deletedEarnings.count}`)
    console.log(`   - Market data: ${deletedMarket.count}`)
    
    return {
      success: true,
      deleted: {
        earnings: deletedEarnings.count,
        market: deletedMarket.count
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
