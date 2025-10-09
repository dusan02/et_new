#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { Worker } from 'bullmq';
import { initRedis } from '@/lib/redis';
import { PolygonProvider } from '@/lib/providers/polygon';
import { setJSON, renameKey, exists } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { shouldPublish, computeCoverage } from '@/lib/dq-gate';

// Load environment variables
config();

const prisma = new PrismaClient();
const polygonProvider = new PolygonProvider(process.env.POLYGON_API_KEY || 'demo_key');

interface JobData {
  tickers: string[];
  day: string;
}

/**
 * Process prices job
 */
async function processPricesJob(jobData: JobData): Promise<void> {
  const { tickers, day } = jobData;
  const dayDate = new Date(day);
  
  logger.info('Processing prices job', {
    tickersCount: tickers.length,
    day,
    tickers: tickers.slice(0, 5) // Log first 5 tickers
  });

  try {
    // 1. Fetch snapshot data from Polygon
    const snapshotData = await polygonProvider.getSnapshotTickers(tickers);
    
    // 2. Normalize and upsert to database
    const upsertPromises = snapshotData.map(async (data) => {
      return prisma.pricesDaily.upsert({
        where: {
          ticker_day: {
            ticker: data.ticker,
            day: dayDate
          }
        },
        update: {
          last: data.last,
          marketCap: data.marketCap,
          sharesOutstanding: data.sharesOutstanding,
          priceStale: false,
          source: data.source,
          updatedAt: new Date()
        },
        create: {
          ticker: data.ticker,
          day: dayDate,
          last: data.last,
          marketCap: data.marketCap,
          sharesOutstanding: data.sharesOutstanding,
          priceStale: false,
          source: data.source
        }
      });
    });

    await Promise.all(upsertPromises);
    
    logger.info('Prices data upserted', {
      day,
      upserted: snapshotData.length
    });

    // 3. Calculate coverage
    const totalTickers = tickers.length;
    const tickersWithPrice = snapshotData.filter(d => d.last !== null).length;
    const coveragePrice = totalTickers > 0 ? Math.round((tickersWithPrice / totalTickers) * 100) : 0;

    // 4. Create staging payload
    const stagingPayload = {
      day,
      publishedAt: new Date().toISOString(),
      coverage: {
        schedule: 0, // Will be calculated in Sprint 3
        price: coveragePrice,
        epsRev: 0 // Will be calculated in Sprint 3
      },
      data: snapshotData.map(d => ({
        ticker: d.ticker,
        last_price: d.last,
        market_cap: d.marketCap,
        shares_outstanding: d.sharesOutstanding,
        price_stale: false,
        source: d.source,
        updated_at: new Date().toISOString()
      })),
      flags: ['prices_worker', 'polygon_source']
    };

    // 5. Save to staging
    const stagingKey = `earnings:${day}:staging`;
    await setJSON(stagingKey, stagingPayload);

    // 6. Update publish metadata
    await prisma.publishMeta.upsert({
      where: { day: dayDate },
      update: {
        coveragePrice,
        updatedAt: new Date()
      },
      create: {
        day: dayDate,
        coveragePrice,
        status: 'staging'
      }
    });

    // 7. Check DQ gate and publish if passes
    const coverage = {
      schedule: 0, // Sprint 3
      price: coveragePrice,
      epsRev: 0 // Sprint 3
    };

    if (shouldPublish(coverage)) {
      // Atomic rename staging -> published
      const publishedKey = `earnings:${day}:published`;
      const metaKey = 'earnings:latest:meta';
      
      await renameKey(stagingKey, publishedKey);
      await setJSON(metaKey, {
        day,
        publishedAt: stagingPayload.publishedAt,
        coverage: stagingPayload.coverage,
        status: 'published'
      });

      // Update publish metadata
      await prisma.publishMeta.update({
        where: { day: dayDate },
        data: {
          publishedAt: new Date(),
          status: 'published',
          updatedAt: new Date()
        }
      });

      logger.info('Published to Redis', {
        day,
        coverage,
        dataCount: stagingPayload.data.length
      });
    } else {
      logger.info('DQ gate blocked publish', {
        day,
        coverage,
        threshold: { schedule: 95, price: 98, epsRev: 90 }
      });
    }

  } catch (error) {
    logger.error('Error processing prices job:', error);
    throw error;
  }
}

/**
 * Start the prices worker
 */
async function startPricesWorker(): Promise<void> {
  logger.info('Starting prices worker', {
    concurrency: 20,
    queue: 'q-prices'
  });

  const connection = initRedis();
  const worker = new Worker('q-prices', async (job) => {
    const jobData = job.data as JobData;
    await processPricesJob(jobData);
  }, {
    connection,
    concurrency: 20,
  });

  worker.on('ready', () => {
    logger.info('Prices worker started successfully');
  });

  worker.on('error', (error) => {
    logger.error('Prices worker error:', error);
  });

  worker.on('completed', (job) => {
    logger.info('Prices job completed', {
      jobId: job.id,
      tickers: job.data.tickers?.length || 0,
      day: job.data.day,
    });
  });

  worker.on('failed', (job, err) => {
    logger.error('Prices job failed', {
      jobId: job?.id,
      tickers: job?.data.tickers?.length || 0,
      day: job?.data.day,
      error: err.message,
    });
  });
}

// Start worker if called directly
if (require.main === module) {
  startPricesWorker()
    .then(() => {
      logger.info('Prices worker running...');
    })
    .catch((error) => {
      logger.error('Failed to start prices worker:', error);
      process.exit(1);
    });
}

export { startPricesWorker, processPricesJob };
