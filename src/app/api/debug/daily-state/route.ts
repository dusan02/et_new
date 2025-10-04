import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Get today's date
    const now = new Date()
    const nyTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }))
    const today = new Date(Date.UTC(nyTime.getFullYear(), nyTime.getMonth(), nyTime.getDate()))
    const todayString = today.toISOString().split('T')[0]
    
    // Get daily reset state
    const resetState = await prisma.dailyResetState.findFirst({
      where: { date: today },
      orderBy: { updatedAt: 'desc' }
    })
    
    const dailyState = resetState?.state || 'INIT'
    
    // Get data counts
    const rowsToday = await prisma.earningsTickersToday.count({
      where: { reportDate: today }
    })
    
    const marketToday = await prisma.todayEarningsMovements.count({
      where: { reportDate: today }
    })
    
    const response = {
      timestamp: new Date().toISOString(),
      date: todayString,
      dailyState,
      resetStateDetails: resetState ? {
        state: resetState.state,
        resetAt: resetState.resetAt?.toISOString(),
        fetchAt: resetState.fetchAt?.toISOString(),
        updatedAt: resetState.updatedAt.toISOString()
      } : null,
      counts: {
        earnings: { today: rowsToday },
        market: { today: marketToday }
      },
      health: {
        isHealthy: dailyState === 'FETCH_DONE',
        issues: []
      }
    }
    
    // Add health issues
    if (dailyState === 'INIT') {
      response.health.issues.push('Daily reset not started')
    } else if (dailyState === 'RESET_DONE') {
      response.health.issues.push('Daily reset completed but fetch not finished')
    }
    
    if (rowsToday === 0 && new Date().getHours() >= 8) {
      response.health.issues.push('No data for today after 8 AM')
    }
    
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Debug-Endpoint': 'daily-state'
      }
    })
    
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get debug info',
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
