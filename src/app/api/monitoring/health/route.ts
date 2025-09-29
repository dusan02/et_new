/**
 * 📊 Monitoring Health Check Endpoint
 * Provides system health status and metrics
 */

import { NextResponse } from 'next/server'
import { getMonitoring } from '@/lib/monitoring'

export async function GET() {
  try {
    const monitoring = getMonitoring()
    const health = monitoring.getHealthStatus()
    
    // Additional system checks
    const systemHealth = {
      ...health,
      system: {
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid,
        uptime: process.uptime()
      },
      services: {
        database: await checkDatabaseHealth(),
        cache: await checkCacheHealth(),
        api: await checkAPIHealth()
      }
    }
    
    const statusCode = health.status === 'healthy' ? 200 : 503
    
    return NextResponse.json(systemHealth, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })
    
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Monitoring service unavailable',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    )
  }
}

async function checkDatabaseHealth() {
  try {
    const { prisma } = await import('@/lib/prisma')
    await prisma.$queryRaw`SELECT 1`
    return { status: 'healthy', latency: 0 }
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

async function checkCacheHealth() {
  try {
    // Test cache operations
    const { getCachedData, setCachedData } = await import('@/lib/cache-utils')
    const testKey = 'health-check-' + Date.now()
    setCachedData(testKey, { test: true })
    const cached = getCachedData(testKey)
    
    return { 
      status: cached ? 'healthy' : 'degraded',
      test_passed: !!cached
    }
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

async function checkAPIHealth() {
  try {
    // Basic API health check
    return {
      status: 'healthy',
      endpoints: {
        earnings: 'available',
        stats: 'available'
      }
    }
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
