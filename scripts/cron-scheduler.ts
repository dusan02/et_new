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
  const tickers = await prisma.pricesDaily.findMany({
    where: {
      day: new Date(today),
    },
    select: {
      ticker: true,
    },
  });
  return tickers.map(t => t.ticker);
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
    const tickers = await getTodaysTickers();
    if (tickers.length === 0) {
      logger.warn('No tickers found for prices processing');
      return;
    }
    
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
  
  // Keep process alive
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down cron scheduler...');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down cron scheduler...');
    process.exit(0);
  });
}

export { startCronScheduler, dailyReset, pricesWorker, epsRevWorker, publishAttempt };