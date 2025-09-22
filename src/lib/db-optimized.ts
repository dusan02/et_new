// Optimized database queries with connection pooling
import { PrismaClient } from '@prisma/client';
import { CacheManager } from './redis-cache';

// Connection pooling for better performance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// Optimized queries with caching
export class OptimizedQueries {
  
  // Get today's earnings with intelligent caching
  static async getTodaysEarnings(date: Date) {
    const cacheKey = `earnings:${date.toISOString().split('T')[0]}`;
    
    // Try cache first
    const cached = await CacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    const startTime = Date.now();
    
    // Optimized query with specific field selection
    const earnings = await db.earningsTickersToday.findMany({
      where: {
        reportDate: {
          gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
        },
      },
      select: {
        ticker: true,
        reportTime: true,
        epsActual: true,
        epsEstimate: true,
        revenueActual: true,
        revenueEstimate: true,
        sector: true,
        companyType: true,
        dataSource: true,
        fiscalPeriod: true,
        fiscalYear: true,
        primaryExchange: true,
      },
      orderBy: [
        { reportTime: 'asc' },
        { ticker: 'asc' }
      ],
    });
    
    const queryTime = Date.now() - startTime;
    console.log(`[DB] Earnings query completed in ${queryTime}ms`);
    
    // Cache for 5 minutes
    await CacheManager.set(cacheKey, earnings);
    
    return earnings;
  }
  
  // Get market movements with caching
  static async getMarketMovements(date: Date) {
    const cacheKey = `movements:${date.toISOString().split('T')[0]}`;
    
    const cached = await CacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    const startTime = Date.now();
    
    const movements = await db.todayEarningsMovements.findMany({
      where: {
        reportDate: {
          gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
        },
      },
      select: {
        ticker: true,
        companyName: true,
        currentPrice: true,
        previousClose: true,
        marketCap: true,
        size: true,
        marketCapDiff: true,
        marketCapDiffBillions: true,
        priceChangePercent: true,
        sharesOutstanding: true,
        companyType: true,
        primaryExchange: true,
        reportTime: true,
      },
      orderBy: [
        { marketCap: 'desc' },
        { ticker: 'asc' }
      ],
    });
    
    const queryTime = Date.now() - startTime;
    console.log(`[DB] Movements query completed in ${queryTime}ms`);
    
    await CacheManager.set(cacheKey, movements);
    
    return movements;
  }
  
  // Bulk invalidate cache when data changes
  static async invalidateCache(date: Date) {
    const dateStr = date.toISOString().split('T')[0];
    await CacheManager.invalidate(`*${dateStr}*`);
    console.log(`[DB] Cache invalidated for date: ${dateStr}`);
  }
}

// Connection health check
export async function checkDbHealth() {
  try {
    await db.$queryRaw`SELECT 1`;
    return { healthy: true, timestamp: new Date() };
  } catch (error) {
    console.error('[DB] Health check failed:', error);
    return { healthy: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
