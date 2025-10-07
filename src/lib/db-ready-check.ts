import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Database readiness check utilities
 * Ensures cron jobs don't start before database is ready
 */

export interface DbHealthCheck {
  ready: boolean;
  latency: number;
  error?: string;
  details?: {
    connection: boolean;
    query: boolean;
    migrations: boolean;
  };
}

/**
 * Check if database is ready for operations
 */
export async function ensureDbReady(timeoutMs: number = 30000): Promise<DbHealthCheck> {
  const startTime = Date.now();
  
  try {
    // Test basic connection
    const connectionStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const connectionLatency = Date.now() - connectionStart;
    
    // Test a more complex query
    const queryStart = Date.now();
    await prisma.earningsTickersToday.count();
    const queryLatency = Date.now() - queryStart;
    
    // Test if migrations are up to date (check if tables exist)
    const migrationStart = Date.now();
    await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='EarningsTickersToday'`;
    const migrationLatency = Date.now() - migrationStart;
    
    const totalLatency = Date.now() - startTime;
    
    return {
      ready: true,
      latency: totalLatency,
      details: {
        connection: true,
        query: true,
        migrations: true
      }
    };
    
  } catch (error) {
    const totalLatency = Date.now() - startTime;
    
    console.error('❌ Database readiness check failed:', error);
    
    return {
      ready: false,
      latency: totalLatency,
      error: error instanceof Error ? error.message : 'Unknown database error',
      details: {
        connection: false,
        query: false,
        migrations: false
      }
    };
  }
}

/**
 * Wait for database to be ready with retries
 */
export async function waitForDbReady(
  maxRetries: number = 10,
  retryDelayMs: number = 5000,
  timeoutMs: number = 60000
): Promise<boolean> {
  const startTime = Date.now();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔍 Database readiness check attempt ${attempt}/${maxRetries}...`);
    
    const health = await ensureDbReady(timeoutMs);
    
    if (health.ready) {
      console.log(`✅ Database is ready (latency: ${health.latency}ms)`);
      return true;
    }
    
    console.log(`⚠️ Database not ready: ${health.error}`);
    
    // Check if we've exceeded total timeout
    if (Date.now() - startTime > timeoutMs) {
      console.error(`❌ Database readiness timeout after ${timeoutMs}ms`);
      return false;
    }
    
    // Don't wait after the last attempt
    if (attempt < maxRetries) {
      console.log(`⏳ Waiting ${retryDelayMs}ms before retry...`);
      await sleep(retryDelayMs);
    }
  }
  
  console.error(`❌ Database failed to become ready after ${maxRetries} attempts`);
  return false;
}

/**
 * Check if database is healthy (quick check)
 */
export async function isDbHealthy(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return false;
  }
}

/**
 * Get database connection info
 */
export async function getDbInfo(): Promise<{
  connected: boolean;
  latency: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;
    
    return {
      connected: true,
      latency
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    
    return {
      connected: false,
      latency,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test database with a simple operation
 */
export async function testDbOperation(): Promise<{
  success: boolean;
  operation: string;
  latency: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    // Test a simple count operation
    const count = await prisma.earningsTickersToday.count();
    const latency = Date.now() - startTime;
    
    return {
      success: true,
      operation: `count() returned ${count}`,
      latency
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    
    return {
      success: false,
      operation: 'count()',
      latency,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Database readiness middleware for cron jobs
 */
export async function withDbReady<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelayMs?: number;
    timeoutMs?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 5,
    retryDelayMs = 2000,
    timeoutMs = 30000
  } = options;
  
  // Wait for database to be ready
  const dbReady = await waitForDbReady(maxRetries, retryDelayMs, timeoutMs);
  
  if (!dbReady) {
    throw new Error('Database not ready after maximum retries');
  }
  
  // Execute the operation
  return await operation();
}
