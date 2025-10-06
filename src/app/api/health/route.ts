import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createJsonResponse } from '@/lib/json-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const detailed = searchParams.get('detailed') === '1'
    
    // Basic health check
    const dbConnected = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false)
    
    if (!detailed) {
      return createJsonResponse({
        status: 'ok',
        ready: dbConnected,
        timestamp: new Date().toISOString()
      })
    }
    
    // Detailed health check with market data analysis
    const today = new Date().toISOString().split('T')[0]
    
    // Get today's market data
    const marketData = await prisma.todayEarningsMovements.findMany({
      where: {
        reportDate: {
          gte: new Date(today + 'T00:00:00.000Z'),
          lt: new Date(today + 'T23:59:59.999Z')
        }
      },
      select: {
        ticker: true,
        currentPrice: true,
        previousClose: true,
        priceChangePercent: true
      }
    })
    
    // Analyze data quality
    const totalTickers = marketData.length
    const zeroChangeTickers = marketData.filter(m => 
      m.priceChangePercent === 0 || 
      m.priceChangePercent === null ||
      m.currentPrice === m.previousClose
    ).length
    
    const ratioZeroChange = totalTickers > 0 ? zeroChangeTickers / totalTickers : 0
    
    // Market session detection
    const nowUTC = new Date()
    const nyTime = new Date(nowUTC.toLocaleString("en-US", {timeZone: "America/New_York"}))
    const hour = nyTime.getHours()
    const isRTH = hour >= 9 && hour < 16
    
    // Health status
    const isHealthy = dbConnected && (
      !isRTH || // Outside market hours - always healthy
      ratioZeroChange < 0.7 || // Less than 70% zero changes during market hours
      totalTickers === 0 // No data yet
    )
    
    const result = {
      status: isHealthy ? 'ok' : 'warning',
      ready: dbConnected,
      timestamp: new Date().toISOString(),
      marketSession: isRTH ? 'open' : 'closed',
      dataQuality: {
        totalTickers,
        zeroChangeTickers,
        ratioZeroChange: Math.round(ratioZeroChange * 100) / 100,
        isHealthy: isHealthy
      },
      recommendations: []
    }
    
    // Add recommendations if unhealthy
    if (!isHealthy && isRTH && ratioZeroChange >= 0.7) {
      result.recommendations.push('High ratio of zero price changes detected during market hours')
      result.recommendations.push('Consider clearing market data cache')
    }
    
    if (!dbConnected) {
      result.recommendations.push('Database connection failed')
    }
    
    return createJsonResponse(result)
    
  } catch (error) {
    console.error('[HEALTH] Error:', error)
    
    return createJsonResponse({
      status: 'error',
      ready: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { 'status': '500' })
  }
}