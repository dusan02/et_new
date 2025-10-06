import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isoDate } from '@/modules/shared'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Health check endpoint
 * Returns system readiness and last fetch status
 */
export async function GET() {
  try {
    const todayString = isoDate()
    const today = new Date(todayString + 'T00:00:00.000Z')
    
    // Quick count of today's earnings
    const count = await prisma.earningsTickersToday.count({
      where: { reportDate: today }
    })
    
    // Get latest createdAt (last fetch timestamp)
    const latest = await prisma.earningsTickersToday.findFirst({
      where: { reportDate: today },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    })
    
    const ready = count > 0
    const lastFetchAt = latest?.createdAt?.toISOString() || null
    
    return NextResponse.json({
      status: 'ok',
      ready,
      total: count,
      date: todayString,
      lastFetchAt,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      }
    })
    
  } catch (error) {
    console.error('[HEALTH] Error:', error)
    
    return NextResponse.json({
      status: 'error',
      ready: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache',
      }
    })
  }
}

