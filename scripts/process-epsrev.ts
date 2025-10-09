#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { FinnhubProvider } from '../src/lib/providers/finnhub';
import { setJSON, renameKey, getJSON } from '../src/lib/redis';
import { logger } from '../src/lib/logger';
import { shouldPublish } from '../src/lib/dq-gate';

// Load environment variables
config();

const prisma = new PrismaClient();
const finnhubProvider = new FinnhubProvider(process.env.FINNHUB_API_KEY || 'demo_key');

/**
 * Process EPS/REV for today's tickers (simple version without BullMQ)
 */
async function processEpsRevSimple(): Promise<void> {
  try {
    // Get today's date in US/Eastern timezone
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const today = easternTime.toISOString().split('T')[0];
    const todayDate = new Date(today);

    logger.info('Processing EPS/REV (simple)', { day: today });

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

    logger.info('Fetching earnings from Finnhub', { tickersCount: tickers.length });

    // Fetch earnings data from Finnhub
    const earningsData = await finnhubProvider.getEarningsTickers(tickers, today);
    
    // Upsert to database
    const upsertPromises = earningsData.map(async (data) => {
      return prisma.earningsDaily.upsert({
        where: {
          ticker_day: {
            ticker: data.ticker,
            day: todayDate
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
          day: todayDate,
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
      day: today,
      upserted: earningsData.length
    });

    // Calculate coverage
    const totalTickers = tickers.length;
    const tickersWithEpsRev = earningsData.filter(d => 
      (d.epsEst !== null || d.epsAct !== null) && 
      (d.revEst !== null || d.revAct !== null)
    ).length;
    const coverageEpsRev = totalTickers > 0 ? Math.round((tickersWithEpsRev / totalTickers) * 100) : 0;

    // Get existing publish metadata
    const existingMeta = await prisma.publishMeta.findUnique({
      where: { day: todayDate }
    });

    const currentCoveragePrice = existingMeta?.coveragePrice || 0;
    const currentCoverageSchedule = existingMeta?.coverageSchedule || 0;

    // Update publish metadata
    await prisma.publishMeta.upsert({
      where: { day: todayDate },
      update: {
        coverageEpsrev: coverageEpsRev,
        updatedAt: new Date()
      },
      create: {
        day: todayDate,
        coverageSchedule: currentCoverageSchedule,
        coveragePrice: currentCoveragePrice,
        coverageEpsrev: coverageEpsRev,
        status: 'staging'
      }
    });

    // Check if we should attempt to publish
    const coverage = {
      schedule: currentCoverageSchedule,
      price: currentCoveragePrice,
      epsRev: coverageEpsRev
    };

    if (shouldPublish(coverage)) {
      // Get existing staging data or create new
      const stagingKey = `earnings:${today}:staging`;
      let stagingData = await getJSON(stagingKey);
      
      if (!stagingData) {
        // Create new staging data
        stagingData = {
          day: today,
          publishedAt: new Date().toISOString(),
          coverage,
          data: [],
          flags: ['epsrev_worker', 'finnhub_source']
        };
      }

      // FIXED: Update staging data with earnings info - start with ALL earnings tickers
      stagingData.coverage = coverage;
      
      // Create earnings data for publish in the correct format
      const earningsDataForPublish = earningsData.map(e => ({
        ticker: e.ticker,
        eps_est: e.epsEst,
        eps_act: e.epsAct,
        rev_est: e.revEst,
        rev_act: e.revAct,
        actual_pending: e.actualPending,
        has_schedule: e.hasSchedule,
        schedule_inferred: e.scheduleInferred
      }));
      
      // FIXED: Start with ALL earnings tickers, then find market data for each
      stagingData.data = earningsDataForPublish.map((earningsItem: any) => {
        const priceItem = stagingData.data.find((p: any) => p.ticker === earningsItem.ticker);
        return { ...earningsItem, ...priceItem };
      });

      // Save updated staging data
      await setJSON(stagingKey, stagingData);

      // Atomic rename staging -> published
      const publishedKey = `earnings:${today}:published`;
      const metaKey = 'earnings:latest:meta';
      
      await renameKey(stagingKey, publishedKey);
      await setJSON(metaKey, {
        day: today,
        publishedAt: stagingData.publishedAt,
        coverage: stagingData.coverage,
        status: 'published'
      });

      // Update publish metadata
      await prisma.publishMeta.update({
        where: { day: todayDate },
        data: {
          publishedAt: new Date(),
          status: 'published',
          updatedAt: new Date()
        }
      });

      logger.info('Published to Redis', {
        day: today,
        coverage,
        dataCount: stagingData.data.length
      });

      console.log('✅ EPS/REV processed and published successfully!');
      console.log(`📊 Coverage: Price ${coverage.price}%, EPS/REV ${coverage.epsRev}%`);
      console.log(`📈 Data: ${stagingData.data.length} tickers`);
    } else {
      logger.info('DQ gate blocked publish', {
        day: today,
        coverage,
        threshold: { schedule: 95, price: 98, epsRev: 90 }
      });

      console.log('⚠️ EPS/REV processed but not published (coverage too low)');
      console.log(`📊 Coverage: Price ${coverage.price}% (need 98%), EPS/REV ${coverage.epsRev}% (need 90%)`);
    }

  } catch (error) {
    logger.error('Error processing EPS/REV:', error);
    console.error('❌ Failed to process EPS/REV:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  processEpsRevSimple()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { processEpsRevSimple };
