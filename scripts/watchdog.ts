#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { getJSON, getRedis } from '../src/lib/redis';
import { logger } from '../src/lib/logger';
import { processPricesBatch, processEpsRevBatch } from '../src/workers/batch-processor';
import { format } from 'date-fns';

// Load environment variables
config();

const prisma = new PrismaClient();

// Mode switch
const ONCE = process.argv.includes('--once') || process.env.WATCHDOG_MODE === 'oneshot';
const intervalMs = Number(process.env.WATCHDOG_INTERVAL_MS ?? 300000); // default 5 min

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
 * Watchdog - monitors freshness and coverage, auto-fixes issues
 */
async function watchdog() {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    logger.info('Watchdog check started', { day: today });

    // 1. Check published data freshness
    const metaKey = 'earnings:latest:meta';
    const meta = await getJSON(metaKey);
    
    if (meta && meta.publishedAt) {
      const publishedAt = new Date(meta.publishedAt);
      const now = new Date();
      const ageMinutes = Math.floor((now.getTime() - publishedAt.getTime()) / (1000 * 60));
      
      if (ageMinutes > 60) {
        logger.warn('Published data is stale, triggering refresh', { 
          day: today, 
          ageMinutes,
          publishedAt: meta.publishedAt
        });
        
        // Enqueue refresh
        const tickers = await getTodaysTickers();
        if (tickers.length > 0) {
          await processPricesBatch(tickers, today);
          await processEpsRevBatch(tickers, today);
          logger.info('Watchdog triggered refresh', { tickerCount: tickers.length });
        }
      }
    }

    // 2. Check coverage thresholds
    const publishMeta = await prisma.publishMeta.findUnique({
      where: { day: new Date(today) },
    });
    
    if (publishMeta) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;
      
      // After 10:00 ET (15:00 UTC) - check price coverage
      if (currentTime >= 15 * 60 && publishMeta.coveragePrice < 90) {
        logger.warn('Price coverage too low, triggering refresh', { 
          day: today, 
          coverage: publishMeta.coveragePrice 
        });
        
        const tickers = await getTodaysTickers();
        if (tickers.length > 0) {
          await processPricesBatch(tickers, today);
          logger.info('Watchdog triggered price refresh', { tickerCount: tickers.length });
        }
      }
      
      // Check EPS/REV coverage - trigger immediately if 0%, otherwise wait until after 20:30 ET
      const shouldTriggerEpsRev = publishMeta.coverageEpsrev === 0 || 
                                  (currentTime >= 1 * 60 + 30 && publishMeta.coverageEpsrev < 70);
      
      if (shouldTriggerEpsRev) {
        logger.warn('EPS/REV coverage too low, triggering fetch', { 
          day: today, 
          coverage: publishMeta.coverageEpsrev 
        });
        
        const tickers = await getTodaysTickers();
        if (tickers.length > 0) {
          await processEpsRevBatch(tickers, today);
          logger.info('Watchdog triggered EPS/REV fetch', { tickerCount: tickers.length });
        }
      }
    }

    logger.info('Watchdog check completed', { day: today });

  } catch (error: any) {
    logger.error('Watchdog failed:', error);
  }
}

/**
 * Run watchdog once and exit
 */
async function runOnceAndExit() {
  await watchdog();
  try { await getRedis().quit(); } catch {}
  try { await prisma.$disconnect(); } catch {}
  process.exit(0);
}

/**
 * Start watchdog daemon (runs every 5 minutes)
 */
async function startWatchdog() {
  logger.info('Starting watchdog daemon');
  
  // Run immediately
  await watchdog();
  
  // Then every interval
  const timer = setInterval(() => watchdog().catch(console.error), intervalMs);
  
  // Graceful shutdown
  const stop = async () => { 
    clearInterval(timer); 
    try { await getRedis().quit(); } catch {} 
    try { await prisma.$disconnect(); } catch {}
    process.exit(0); 
  };
  
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  
  logger.info(`Watchdog daemon started, running every ${intervalMs/1000}s`);
}

// Start if called directly
if (require.main === module) {
  if (ONCE) {
    runOnceAndExit().catch((e) => { 
      console.error(e); 
      process.exit(1); 
    });
  } else {
    startWatchdog()
      .then(() => {
        logger.info('Watchdog daemon running...');
      })
      .catch((error) => {
        logger.error('Failed to start watchdog:', error);
        process.exit(1);
      });
  }
}

export { watchdog, startWatchdog };