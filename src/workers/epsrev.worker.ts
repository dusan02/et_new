#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { FinnhubProvider } from '@/lib/providers/finnhub';
import { setJSON, renameKey, exists } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { shouldPublish, computeCoverage } from '@/lib/dq-gate';

// Load environment variables
config();

const prisma = new PrismaClient();
const finnhubProvider = new FinnhubProvider(process.env.FINNHUB_API_KEY || 'demo_key');

interface JobData {
  tickers: string[];
  day: string;
  isBackfill?: boolean;
}

/**
 * Process EPS/REV job
 */
async function processEpsRevJob(jobData: JobData): Promise<void> {
  const { tickers, day, isBackfill = false } = jobData;
  const dayDate = new Date(day);
  
  logger.info('Processing EPS/REV job', {
    tickersCount: tickers.length,
    day,
    isBackfill,
    tickers: tickers.slice(0, 5) // Log first 5 tickers
  });

  try {
    // 1. Fetch earnings data from Finnhub
    const earningsData = await finnhubProvider.getEarningsTickers(tickers, day);
    
    // 2. Normalize and upsert to database
    const upsertPromises = earningsData.map(async (data) => {
      return prisma.earningsDaily.upsert({
        where: {
          ticker_day: {
            ticker: data.ticker,
            day: dayDate
          }
        },
        update: {
          epsEst: data.epsEst,
          epsAct: data.epsAct,
          revEst: data.revEst,
          revAct: data.revAct,
          hasSchedule: data.hasSchedule,
          scheduleInferred: data.scheduleInferred,
          actualPending: data.actualPending,
          source: data.source,
          updatedAt: new Date()
        },
        create: {
          ticker: data.ticker,
          day: dayDate,
          epsEst: data.epsEst,
          epsAct: data.epsAct,
          revEst: data.revEst,
          revAct: data.revAct,
          hasSchedule: data.hasSchedule,
          scheduleInferred: data.scheduleInferred,
          actualPending: data.actualPending,
          source: data.source
        }
      });
    });

    await Promise.all(upsertPromises);
    
    logger.info('Earnings data upserted', {
      day,
      upserted: earningsData.length,
      isBackfill
    });

    // 3. Calculate coverage
    const totalTickers = tickers.length;
    const tickersWithEpsRev = earningsData.filter(d => 
      (d.epsEst !== null || d.epsAct !== null) && 
      (d.revEst !== null || d.revAct !== null)
    ).length;
    const coverageEpsRev = totalTickers > 0 ? Math.round((tickersWithEpsRev / totalTickers) * 100) : 0;

    // 4. Get existing publish metadata
    const existingMeta = await prisma.publishMeta.findUnique({
      where: { day: dayDate }
    });

    const currentCoveragePrice = existingMeta?.coveragePrice || 0;
    const currentCoverageSchedule = existingMeta?.coverageSchedule || 0;

    // 5. Update publish metadata
    await prisma.publishMeta.upsert({
      where: { day: dayDate },
      update: {
        coverageEpsrev: coverageEpsRev,
        updatedAt: new Date()
      },
      create: {
        day: dayDate,
        coverageSchedule: currentCoverageSchedule,
        coveragePrice: currentCoveragePrice,
        coverageEpsrev: coverageEpsRev,
        status: 'staging'
      }
    });

    // 6. Check if we should attempt to publish
    const coverage = {
      schedule: currentCoverageSchedule,
      price: currentCoveragePrice,
      epsRev: coverageEpsRev
    };

    if (shouldPublish(coverage)) {
      // Get existing staging data or create new
      const stagingKey = `earnings:${day}:staging`;
      let stagingData = await getJSON(stagingKey);
      
      if (!stagingData) {
        // Create new staging data
        stagingData = {
          day,
          publishedAt: new Date().toISOString(),
          coverage,
          data: [],
          flags: ['epsrev_worker', 'finnhub_source']
        };
      }

      // Update staging data with earnings info
      stagingData.coverage = coverage;
      stagingData.data = stagingData.data.map((item: any) => {
        const earnings = earningsData.find(e => e.ticker === item.ticker);
        if (earnings) {
          return {
            ...item,
            eps_est: earnings.epsEst,
            eps_act: earnings.epsAct,
            rev_est: earnings.revEst,
            rev_act: earnings.revAct,
            actual_pending: earnings.actualPending,
            has_schedule: earnings.hasSchedule,
            schedule_inferred: earnings.scheduleInferred
          };
        }
        return item;
      });

      // Save updated staging data
      await setJSON(stagingKey, stagingData);

      // Atomic rename staging -> published
      const publishedKey = `earnings:${day}:published`;
      const metaKey = 'earnings:latest:meta';
      
      await renameKey(stagingKey, publishedKey);
      await setJSON(metaKey, {
        day,
        publishedAt: stagingData.publishedAt,
        coverage: stagingData.coverage,
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
        dataCount: stagingData.data.length,
        isBackfill
      });
    } else {
      logger.info('DQ gate blocked publish', {
        day,
        coverage,
        threshold: { schedule: 95, price: 98, epsRev: 90 },
        isBackfill
      });
    }

  } catch (error) {
    logger.error('Error processing EPS/REV job:', error);
    throw error;
  }
}

/**
 * Start the EPS/REV worker
 */
async function startEpsRevWorker(): Promise<void> {
  logger.info('Starting EPS/REV worker', {
    concurrency: 10,
    queue: 'q:epsrev'
  });

  // For now, we'll use a simple approach without BullMQ
  // In production, you would use BullMQ here
  logger.info('EPS/REV worker started successfully');
}

// Start worker if called directly
if (require.main === module) {
  startEpsRevWorker()
    .then(() => {
      logger.info('EPS/REV worker running...');
    })
    .catch((error) => {
      logger.error('Failed to start EPS/REV worker:', error);
      process.exit(1);
    });
}

export { startEpsRevWorker, processEpsRevJob };
