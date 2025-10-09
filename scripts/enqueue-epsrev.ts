#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { logger } from '../src/lib/logger';
import { format } from 'date-fns';

// Load environment variables
config();

const prisma = new PrismaClient();

/**
 * Enqueue EPS/REV processing job for today's tickers
 */
async function enqueueEpsRevJob() {
  try {
    // Get current day in ET (simplified)
    const now = new Date();
    const todayKey = format(now, 'yyyy-MM-dd');

    logger.info('Enqueuing EPS/REV job', { day: todayKey });

    // Get tickers from prices_daily for today
    const tickers = await prisma.pricesDaily.findMany({
      where: {
        day: new Date(todayKey),
      },
      select: {
        ticker: true,
      },
    });

    const tickerList = tickers.map(t => t.ticker);

    if (tickerList.length === 0) {
      logger.warn('No tickers found for EPS/REV processing', { day: todayKey });
      return;
    }

    logger.info('Found tickers for EPS/REV processing', { 
      day: todayKey, 
      count: tickerList.length,
      tickers: tickerList.slice(0, 5) // Log first 5 tickers
    });

    // For now, just run the processor directly (no BullMQ)
    const { processEpsRevData } = await import('../src/scripts/process-epsrev-simple');
    await processEpsRevData(tickerList, todayKey);

    logger.info('EPS/REV job completed successfully', { 
      day: todayKey, 
      processedTickers: tickerList.length 
    });

  } catch (error: any) {
    logger.error('Error enqueuing EPS/REV job:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  enqueueEpsRevJob()
    .then(() => {
      logger.info('EPS/REV enqueue script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('EPS/REV enqueue script failed:', error);
      process.exit(1);
    });
}

export { enqueueEpsRevJob };
