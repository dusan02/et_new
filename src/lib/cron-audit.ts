import { prisma } from '@/lib/prisma'

export type CronRunStatus = 'RUNNING' | 'OK' | 'ERROR' | 'SKIPPED'

export interface CronRunData {
  name: string
  status: CronRunStatus
  message?: string
  meta?: any
}

/**
 * Audit wrapper for cron jobs - tracks execution and results
 */
export async function auditCronRun<T>(
  name: string, 
  fn: () => Promise<T>
): Promise<T> {
  const startTime = new Date()
  let runId: string | null = null
  
  try {
    // Create audit record
    const run = await prisma.cronRun.create({
      data: {
        name,
        status: 'RUNNING',
        startedAt: startTime
      }
    })
    runId = run.id
    
    console.log(`🚀 [${name}] Starting cron job execution`)
    
    // Execute the function
    const result = await fn()
    
    // Update with success
    await prisma.cronRun.update({
      where: { id: runId },
      data: {
        status: 'OK',
        finishedAt: new Date(),
        message: 'Completed successfully'
      }
    })
    
    const duration = Date.now() - startTime.getTime()
    console.log(`✅ [${name}] Completed successfully in ${duration}ms`)
    
    return result
    
  } catch (error: any) {
    const errorMessage = error?.message?.slice(0, 500) || 'Unknown error'
    
    if (runId) {
      await prisma.cronRun.update({
        where: { id: runId },
        data: {
          status: 'ERROR',
          finishedAt: new Date(),
          message: errorMessage
        }
      }).catch(() => {
        // Ignore if update fails
      })
    }
    
    const duration = Date.now() - startTime.getTime()
    console.error(`❌ [${name}] Failed after ${duration}ms: ${errorMessage}`)
    
    throw error
  }
}

/**
 * Get recent cron run history
 */
export async function getCronRunHistory(limit = 50) {
  return await prisma.cronRun.findMany({
    orderBy: { startedAt: 'desc' },
    take: limit
  })
}

/**
 * Get cron run statistics
 */
export async function getCronRunStats(days = 7) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  
  const stats = await prisma.cronRun.groupBy({
    by: ['name', 'status'],
    where: {
      startedAt: {
        gte: cutoffDate
      }
    },
    _count: {
      id: true
    }
  })
  
  return stats
}
