import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getBootState, getBootStateLastUpdated, isSystemReady } from '@/lib/boot-state';
import { getTodayDate } from '@/lib/daily-reset-state';
import { getCacheStats } from '@/lib/cache-version';
import { isLocked } from '@/lib/redis-lock';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Get current time in NY timezone
    const now = new Date();
    const nyTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const today = getTodayDate();
    
    // Check database connectivity
    let dbStatus = 'unknown';
    let dbLatency = 0;
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = 'error';
      console.error('❌ Database health check failed:', error);
    }
    
    // Get boot state info
    const bootState = getBootState();
    const bootStateLastUpdated = getBootStateLastUpdated();
    const systemReady = isSystemReady();
    
    // Check for active locks
    const mainLockKey = `lock:bootstrap:${today.toISOString().slice(0, 10)}`;
    const isMainLockActive = await isLocked(mainLockKey);
    
    // Get data counts
    let earningsCount = 0;
    let marketDataCount = 0;
    let movementsCount = 0;
    
    if (dbStatus === 'connected') {
      try {
        earningsCount = await prisma.earningsTickersToday.count({
          where: { reportDate: today }
        });
        
        marketDataCount = await prisma.marketData.count({
          where: { reportDate: today }
        });
        
        movementsCount = await prisma.todayEarningsMovements.count({
          where: { reportDate: today }
        });
      } catch (error) {
        console.error('❌ Failed to get data counts:', error);
      }
    }
    
    // Get cache stats
    let cacheStats = null;
    try {
      cacheStats = await getCacheStats();
    } catch (error) {
      console.error('❌ Failed to get cache stats:', error);
    }
    
    // Get recent cron runs
    let recentCronRuns = [];
    if (dbStatus === 'connected') {
      try {
        recentCronRuns = await prisma.cronRun.findMany({
          take: 5,
          orderBy: { startedAt: 'desc' },
          select: {
            name: true,
            status: true,
            startedAt: true,
            finishedAt: true,
            message: true
          }
        });
      } catch (error) {
        console.error('❌ Failed to get cron runs:', error);
      }
    }
    
    const responseTime = Date.now() - startTime;
    
    const healthData = {
      status: systemReady ? 'healthy' : 'initializing',
      timestamp: now.toISOString(),
      nyTime: nyTime.toISOString(),
      responseTime: `${responseTime}ms`,
      
      system: {
        ready: systemReady,
        bootState,
        bootStateLastUpdated: bootStateLastUpdated.toISOString(),
        description: getBootStateDescription(bootState)
      },
      
      database: {
        status: dbStatus,
        latency: `${dbLatency}ms`,
        today: today.toISOString()
      },
      
      data: {
        earningsToday: earningsCount,
        marketDataToday: marketDataCount,
        movementsToday: movementsCount,
        totalRecords: earningsCount + marketDataCount + movementsCount
      },
      
      locks: {
        mainBootstrapLock: isMainLockActive
      },
      
      cache: cacheStats,
      
      cron: {
        recentRuns: recentCronRuns
      },
      
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasRedis: !!process.env.REDIS_URL,
        hasFinnhub: !!process.env.FINNHUB_API_KEY,
        hasPolygon: !!process.env.POLYGON_API_KEY
      }
    };
    
    // Return appropriate HTTP status
    const httpStatus = systemReady ? 200 : 503;
    
    return NextResponse.json(healthData, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } finally {
    await prisma.$disconnect();
  }
}

function getBootStateDescription(state: string): string {
  const descriptions: Record<string, string> = {
    "00_PENDING": "System starting up...",
    "10_CALENDAR_READY": "Loading earnings calendar...",
    "20_PREVCLOSE_READY": "Loading market data...",
    "30_PREMARKET_READY": "Processing pre-market data...",
    "40_METRICS_READY": "Calculating metrics...",
    "50_CACHE_WARMED": "Warming up cache...",
    "60_PUBLISHED": "System ready"
  };
  
  return descriptions[state] || "Unknown state";
}