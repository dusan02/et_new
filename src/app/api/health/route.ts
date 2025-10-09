import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { testConnection } from '@/lib/redis';
import { PrismaClient } from '@prisma/client';
import { MarketDataRetryService } from '@/modules/market-data/services/market-data-retry.service';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime: number;
      error?: string;
    };
    redis: {
      status: 'healthy' | 'unhealthy';
      responseTime: number;
      error?: string;
    };
    marketData: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      metrics: {
        totalRecords: number;
        recentSuccessRate: number;
        lastUpdate: string | null;
      };
      issues: string[];
    };
  };
  overall: {
    uptime: number;
    version: string;
    environment: string;
  };
}

/**
 * Comprehensive health check endpoint
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  logger.info('Health check started', { timestamp });

  const healthResult: HealthCheckResult = {
    status: 'healthy',
    timestamp,
    services: {
      database: { status: 'unhealthy', responseTime: 0 },
      redis: { status: 'unhealthy', responseTime: 0 },
      marketData: {
        status: 'unhealthy',
        metrics: { totalRecords: 0, recentSuccessRate: 0, lastUpdate: null },
        issues: []
      }
    },
    overall: {
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  };

  // Check database connection
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    healthResult.services.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStart
    };
  } catch (error) {
    healthResult.services.database = {
      status: 'unhealthy',
      responseTime: 0,
      error: error instanceof Error ? error.message : 'Database connection failed'
    };
    healthResult.status = 'unhealthy';
  }

  // Check Redis connection
  try {
    const redisStart = Date.now();
    const isConnected = await testConnection();
    healthResult.services.redis = {
      status: isConnected ? 'healthy' : 'unhealthy',
      responseTime: Date.now() - redisStart,
      error: isConnected ? undefined : 'Redis connection failed'
    };
    
    if (!isConnected) {
      healthResult.status = 'degraded'; // Redis is optional in development
    }
  } catch (error) {
    healthResult.services.redis = {
      status: 'unhealthy',
      responseTime: 0,
      error: error instanceof Error ? error.message : 'Redis connection failed'
    };
    healthResult.status = 'degraded'; // Redis is optional in development
  }

  // Check market data service
  try {
    const marketDataService = new MarketDataRetryService();
    
    // Check today's market data specifically
    const today = new Date();
    const easternTime = new Date(today.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const todayDate = new Date(Date.UTC(easternTime.getFullYear(), easternTime.getMonth(), easternTime.getDate()));
    
    const todayData = await marketDataService.getMarketDataForDate(todayDate);
    const todayCount = todayData.data.length;
    const todaySuccessRate = todayData.statistics.successRate;
    
    let marketDataStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const issues: string[] = [];
    
    if (todayCount === 0) {
      marketDataStatus = 'unhealthy';
      issues.push(`No market data for today (${todayDate.toISOString().slice(0, 10)})`);
    } else if (todaySuccessRate < 50) {
      marketDataStatus = 'unhealthy';
      issues.push(`Low success rate for today: ${todaySuccessRate.toFixed(1)}%`);
    } else if (todaySuccessRate < 70) {
      marketDataStatus = 'degraded';
      issues.push(`Moderate success rate for today: ${todaySuccessRate.toFixed(1)}%`);
    }
    
    healthResult.services.marketData = {
      status: marketDataStatus,
      metrics: {
        totalRecords: todayCount,
        recentSuccessRate: todaySuccessRate,
        lastUpdate: todayCount > 0 ? todayData.data[0]?.updatedAt?.toISOString() || null : null
      },
      issues
    };
    
    if (marketDataStatus === 'unhealthy') {
      healthResult.status = 'unhealthy';
    } else if (marketDataStatus === 'degraded' && healthResult.status === 'healthy') {
      healthResult.status = 'degraded';
    }
  } catch (error) {
    healthResult.services.marketData = {
      status: 'unhealthy',
      metrics: { totalRecords: 0, recentSuccessRate: 0, lastUpdate: null },
      issues: [`Market data health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
    healthResult.status = 'unhealthy';
  }

  // Check earnings data availability
  try {
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const today = new Date(Date.UTC(easternTime.getFullYear(), easternTime.getMonth(), easternTime.getDate()));
    
    const earningsCount = await prisma.earningsTickersToday.count({
      where: { reportDate: today }
    });
    
    if (earningsCount === 0) {
      healthResult.services.marketData.issues.push(`No earnings data for today (${today.toISOString().slice(0, 10)})`);
      if (healthResult.status === 'healthy') {
        healthResult.status = 'degraded';
      }
    }
  } catch (error) {
    healthResult.services.marketData.issues.push(`Earnings data check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const totalResponseTime = Date.now() - startTime;
  
  logger.info('Health check completed', {
    status: healthResult.status,
    responseTime: totalResponseTime,
    databaseStatus: healthResult.services.database.status,
    redisStatus: healthResult.services.redis.status,
    marketDataStatus: healthResult.services.marketData.status
  });

  const statusCode = healthResult.status === 'healthy' ? 200 : 
                    healthResult.status === 'degraded' ? 200 : 503;

  return NextResponse.json(healthResult, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Response-Time': `${totalResponseTime}ms`
    }
  });
}

/**
 * Simple health check for load balancers
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  try {
    // Quick database ping
    await prisma.$queryRaw`SELECT 1`;
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}