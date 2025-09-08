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
    
    // Clean up old guidance data (keep last 30 days)
    const guidanceCutoff = new Date()
    guidanceCutoff.setDate(guidanceCutoff.getDate() - 30)
    
    const deletedGuidance = await prisma.benzingaGuidance.deleteMany({
      where: {
        lastUpdated: {
          lt: guidanceCutoff
        }
      }
    })
    
    // Clean up old guidance import failures (keep last 7 days)
    const deletedFailures = await prisma.guidanceImportFailures.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    })
    
    console.log('✅ Cleanup completed successfully!')
    console.log(`📊 Deleted records:`)
    console.log(`   - Earnings: ${deletedEarnings.count}`)
    console.log(`   - Market data: ${deletedMarket.count}`)
    console.log(`   - Guidance: ${deletedGuidance.count}`)
    console.log(`   - Import failures: ${deletedFailures.count}`)
    
    return {
      success: true,
      deleted: {
        earnings: deletedEarnings.count,
        market: deletedMarket.count,
        guidance: deletedGuidance.count,
        failures: deletedFailures.count
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
