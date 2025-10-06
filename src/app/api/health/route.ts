import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTodayStart, getNYTimeString } from '@/modules/shared'
import { createJsonResponse, stringifyHeaders } from '@/lib/json-utils'
import { detectMarketSession } from '@/lib/market-session'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const detailed = searchParams.get('detailed') === '1'
  
  try {
    const now = new Date()
    const todayStart = getTodayStart()
    
    // Check database connection
    let dbHealthy = false
    try {
      await prisma.$queryRaw`SELECT 1`
      dbHealthy = true
    } catch (error) {
      console.error('Database health check failed:', error)
    }
    
    // Check earnings data for today
    let earningsCount = 0
    try {
      earningsCount = await prisma.earningsTickersToday.count({
        where: {
          reportDate: {
            gte: todayStart,
            lt: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      })
    } catch (error) {
      console.error('Earnings count check failed:', error)
    }
    
    // Check market data for today
    let marketDataCount = 0
    try {
      marketDataCount = await prisma.marketSnapshotsToday.count({
        where: {
          asOf: {
            gte: todayStart,
            lt: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      })
    } catch (error) {
      console.error('Market data count check failed:', error)
    }
    
    const isReady = earningsCount > 0 && marketDataCount > 0 && dbHealthy
    
    // Get market session
    const marketSession = detectMarketSession(now, 'America/New_York')
    
    // Get commit info
    const COMMIT = process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA || 'unknown'
    const TZ = process.env.TZ || 'UTC'
    
    let dataQuality: any = {}
    if (detailed) {
      try {
        const allMarketData = await prisma.marketSnapshotsToday.findMany({
          where: {
            asOf: {
              gte: todayStart,
              lt: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000),
            },
          },
          select: {
            currentPrice: true,
            previousClose: true,
          },
        })
        
        const totalTickers = allMarketData.length
        const zeroChangeTickers = allMarketData.filter(
          (d) => d.currentPrice !== null && d.previousClose !== null && d.currentPrice === d.previousClose
        ).length
        const ratioZeroChange = totalTickers > 0 ? zeroChangeTickers / totalTickers : 0
        const isHealthy = ratioZeroChange < 0.7 // Threshold for unhealthy data
        
        dataQuality = {
          totalTickers,
          zeroChangeTickers,
          ratioZeroChange: parseFloat(ratioZeroChange.toFixed(3)),
          isHealthy,
        }
      } catch (error) {
        console.error('Data quality check failed:', error)
        dataQuality = { error: 'Failed to calculate data quality' }
      }
    }
    
    // Get last fetch time from cron logs
    let lastFetchAt: string | null = null
    try {
      const lastCronLog = await prisma.cronLog.findFirst({ 
        orderBy: { createdAt: 'desc' } 
      })
      lastFetchAt = lastCronLog?.createdAt?.toISOString() || null
    } catch (error) {
      console.error('Last fetch time check failed:', error)
    }
    
    const payload = {
      status: isReady ? 'ok' : 'degraded',
      ready: isReady,
      timestamp: now.toISOString(),
      marketSession,
      commit: COMMIT,
      tz: TZ,
      uptime: process.uptime(),
      checks: {
        database: dbHealthy,
        earnings: earningsCount > 0,
        marketData: marketDataCount > 0,
      },
      ...(earningsCount > 0 && { total: earningsCount }),
      ...(detailed && { dataQuality }),
      ...(lastFetchAt && { lastFetchAt }),
    }
    
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      ...(detailed && {
        'x-build': COMMIT,
        'x-env-tz': TZ,
        'x-market-session': marketSession,
      })
    }
    
    return createJsonResponse(payload, stringifyHeaders(headers))
    
  } catch (error) {
    console.error('Health check error:', error)
    return createJsonResponse(
      { 
        status: 'error', 
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      }, 
      { 
        status: 500,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' }
      }
    )
  }
}