import { PrismaClient } from '@prisma/client'
import { getDailyResetState } from '@/lib/daily-reset-state'

const prisma = new PrismaClient()

async function checkDailyState() {
  try {
    const state = await getDailyResetState()
    console.log(`Daily reset state: ${state}`)
    
    // Also check if we have data for today
    const today = new Date()
    const nyTime = new Date(today.toLocaleString("en-US", { timeZone: "America/New_York" }))
    const todayDate = new Date(Date.UTC(nyTime.getFullYear(), nyTime.getMonth(), nyTime.getDate()))
    
    const todayCount = await prisma.earningsTickersToday.count({
      where: { reportDate: todayDate }
    })
    
    console.log(`Today's data count: ${todayCount}`)
    console.log(`Today's date: ${todayDate.toISOString()}`)
    
    // Exit with appropriate code
    if (state === 'RESET_DONE' && todayCount === 0) {
      console.log('Auto-repair needed: RESET_DONE but no data')
      process.exit(2) // Special code for auto-repair needed
    } else if (state === 'FETCH_DONE') {
      console.log('System healthy: FETCH_DONE')
      process.exit(0)
    } else {
      console.log('System in progress or unknown state')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('Error checking daily state:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  checkDailyState()
}
