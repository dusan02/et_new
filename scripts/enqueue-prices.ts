#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { pricesQueue } from '../src/workers/queue';
import { logger } from '../src/lib/logger';

// Load environment variables
config();

const prisma = new PrismaClient();

/**
 * Enqueue prices job for today's tickers
 */
async function enqueuePricesJob(): Promise<void> {
  try {
    // Get today's date in US/Eastern timezone
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const today = easternTime.toISOString().split('T')[0];
    const todayDate = new Date(today);

    logger.info('Enqueuing prices job', { day: today });

    // Get today's earnings tickers
    const earningsTickers = await prisma.earningsTickersToday.findMany({
      where: {
        reportDate: todayDate
      },
      select: {
        ticker: true
      }
    });

    const tickers = earningsTickers.map(e => e.ticker);

    if (tickers.length === 0) {
      logger.warn('No earnings tickers found for today', { day: today });
      return;
    }

    // Add job to queue
    const job = await pricesQueue.add('prices', {
      tickers,
      day: today
    }, {
      priority: 1,
      delay: 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      }
    });

    logger.info('Prices job enqueued', {
      jobId: job.id,
      tickersCount: tickers.length,
      day: today,
      tickers: tickers.slice(0, 10) // Log first 10 tickers
    });

    console.log('✅ Prices job enqueued successfully!');
    console.log(`📊 Job ID: ${job.id}`);
    console.log(`📈 Tickers: ${tickers.length}`);
    console.log(`📅 Day: ${today}`);

  } catch (error) {
    logger.error('Failed to enqueue prices job:', error);
    console.error('❌ Failed to enqueue prices job:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  enqueuePricesJob()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { enqueuePricesJob };
