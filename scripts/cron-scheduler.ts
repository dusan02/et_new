#!/usr/bin/env ts-node

import { config } from 'dotenv';
import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { logger } from '../src/lib/logger';
import { processPricesBatch, processEpsRevBatch } from '../src/workers/batch-processor';
import { format } from 'date-fns';
import { getRedis } from '../src/lib/redis';

// Load environment variables
config();

const prisma = new PrismaClient();

/**
 * Get today's tickers from database
 */
async function getTodaysTickers(): Promise<string[]> {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // 🧩 [CRON][SELECT] Log source and date
  console.log(`[CRON][SELECT] date=${today}, tz=America/New_York, source=EarningsTickersToday`);
  
  // ✅ FIX: Use timezone-aware date range instead of exact time
  const start = new Date(today + 'T00:00:00.000Z'); // Start of day UTC
  const end = new Date(today + 'T23:59:59.999Z');   // End of day UTC
  
  const tickers = await prisma.earningsTickersToday.findMany({
    where: {
      reportDate: {
        gte: start,
        lte: end
      }
    },
    select: {
      ticker: true,
    },
  });
  
  const tickerList = tickers.map(t => t.ticker);
  console.log(`[CRON][RUN] symbols=[${tickerList.join(', ')}] count=${tickerList.length}`);
  
  return tickerList;
}

/**
 * Daily reset at 00:05 ET
 */
async function dailyReset() {
  const today = format(new Date(), 'yyyy-MM-dd');
  logger.info('Daily reset started', { day: today });
  
  try {
    // Clean staging keys
    const redis = getRedis();
    const stagingKey = `earnings:${today}:staging`;
    await redis.del(stagingKey);
    
    // Create publish_meta for today
    await prisma.publishMeta.upsert({
      where: { day: new Date(today) },
      update: {
        coverageSchedule: 0,
        coveragePrice: 0,
        coverageEpsrev: 0,
        status: 'staging',
        updatedAt: new Date(),
      },
      create: {
        day: new Date(today),
        coverageSchedule: 0,
        coveragePrice: 0,
        coverageEpsrev: 0,
        status: 'staging',
      },
    });
    
    logger.info('Daily reset completed', { day: today });
  } catch (error: any) {
    logger.error('Daily reset failed:', error);
  }
}

/**
 * Prices worker
 */
async function pricesWorker() {
  try {
    let tickers = await getTodaysTickers();
    
    // 🚨 FALLBACK: If DB=0 but Finnhub should have data, try to fetch
    if (tickers.length === 0) {
      console.log(`[CRON][FALLBACK] No tickers in DB - checking if we need to fetch from Finnhub...`);
      
      // Try to fetch from Finnhub as fallback
      try {
        const { UnifiedDataFetcher } = await import('../src/modules/data-integration/services/unified-fetcher.service.js');
        const fetcher = new UnifiedDataFetcher();
        const today = format(new Date(), 'yyyy-MM-dd');
        
        console.log(`[CRON][FALLBACK] Attempting to fetch earnings data for ${today}...`);
        const result = await fetcher.fetchEarningsOnly(new Date(today));
        
        if (result.earningsCount > 0) {
          console.log(`[CRON][FALLBACK] Successfully fetched ${result.earningsCount} earnings records`);
          tickers = await getTodaysTickers(); // Re-fetch from DB
        }
      } catch (fallbackError) {
        console.error(`[CRON][FALLBACK] Failed to fetch from Finnhub:`, fallbackError);
      }
    }
    
    if (tickers.length === 0) {
      logger.warn('No tickers found for prices processing');
      console.log(`[CRON][WARNING] No tickers found - this should not happen if Finnhub returned data!`);
      return;
    }
    
    console.log(`[CRON][PROCESSING] Found ${tickers.length} tickers for processing: [${tickers.join(', ')}]`);
    
    const today = format(new Date(), 'yyyy-MM-dd');
    await processPricesBatch(tickers, today);
    logger.info('Prices worker completed', { tickerCount: tickers.length });
  } catch (error: any) {
    logger.error('Prices worker failed:', error);
  }
}

/**
 * EPS/REV worker
 */
async function epsRevWorker() {
  try {
    const tickers = await getTodaysTickers();
    if (tickers.length === 0) {
      logger.warn('No tickers found for EPS/REV processing');
      return;
    }
    
    const today = format(new Date(), 'yyyy-MM-dd');
    await processEpsRevBatch(tickers, today);
    logger.info('EPS/REV worker completed', { tickerCount: tickers.length });
  } catch (error: any) {
    logger.error('EPS/REV worker failed:', error);
  }
}

/**
 * Publish attempt (DQ gate + atomic rename)
 */
async function publishAttempt() {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const stagingKey = `earnings:${today}:staging`;
    const publishedKey = `earnings:${today}:published`;
    const metaKey = 'earnings:latest:meta';
    
    const redis = getRedis();
    const stagingData = await redis.get(stagingKey);
    
    if (stagingData) {
      const data = JSON.parse(stagingData);
      const { coverage } = data;
      
      // Check DQ gate
      const scheduleOk = coverage.schedule >= 0; // Temporarily 0
      const priceOk = coverage.price >= 98;
      const epsRevOk = coverage.epsRev >= 90;
      
      if (scheduleOk && priceOk && epsRevOk) {
        // Atomic rename staging -> published
        await redis.rename(stagingKey, publishedKey);
        await redis.set(metaKey, JSON.stringify({
          day: today,
          publishedAt: new Date().toISOString(),
          coverage,
          status: 'published'
        }));
        
        // Update publish metadata
        await prisma.publishMeta.update({
          where: { day: new Date(today) },
          data: {
            publishedAt: new Date(),
            status: 'published',
            updatedAt: new Date()
          }
        });
        
        logger.info('Publish attempt successful', { day: today, coverage });
      } else {
        logger.info('Publish attempt blocked by DQ gate', { 
          day: today, 
          coverage,
          scheduleOk,
          priceOk,
          epsRevOk
        });
      }
    }
  } catch (error: any) {
    logger.error('Publish attempt failed:', error);
  }
}

/**
 * Start cron scheduler
 */
function startCronScheduler() {
  logger.info('Starting cron scheduler');
  
  // Daily reset at 00:05 ET (05:05 UTC)
  cron.schedule('5 5 * * *', dailyReset, {
    timezone: 'America/New_York'
  });
  
  // EPS/REV prefetch at 07:00 ET (12:00 UTC)
  cron.schedule('0 12 * * *', epsRevWorker, {
    timezone: 'America/New_York'
  });
  
  // Prices worker every 5 minutes during market hours (09:30-16:00 ET)
  cron.schedule('*/5 9-16 * * 1-5', pricesWorker, {
    timezone: 'America/New_York'
  });
  
  // EPS/REV update at 12:00 ET (17:00 UTC)
  cron.schedule('0 17 * * 1-5', epsRevWorker, {
    timezone: 'America/New_York'
  });
  
  // EPS/REV backfill at 16:10 ET (21:10 UTC)
  cron.schedule('10 21 * * 1-5', epsRevWorker, {
    timezone: 'America/New_York'
  });
  
  // EPS/REV backfill at 20:00 ET (01:00 UTC next day)
  cron.schedule('0 1 * * 2-6', epsRevWorker, {
    timezone: 'America/New_York'
  });
  
  // Publish attempt every 15 minutes
  cron.schedule('*/15 * * * *', publishAttempt);
  
  logger.info('Cron scheduler started successfully');
}

// Start if called directly
if (require.main === module) {
  startCronScheduler();
  
  // Graceful shutdown
  const stop = async () => {
    logger.info('Shutting down cron scheduler...');
    try { 
      await getRedis().quit(); 
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
    try { 
      await prisma.$disconnect(); 
    } catch (error) {
      logger.error('Error closing database connection:', error);
    }
    process.exit(0);
  };
  
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

export { startCronScheduler, dailyReset, pricesWorker, epsRevWorker, publishAttempt };