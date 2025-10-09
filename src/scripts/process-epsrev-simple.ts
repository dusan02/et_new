import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger';
import { setJSON, getJSON, renameKey } from '../lib/redis';
import { computeCoverage, shouldPublish, getCoverageThresholds } from '../lib/dq-gate';

const prisma = new PrismaClient();

/**
 * Simple EPS/REV processor (without BullMQ for now)
 */
export async function processEpsRevData(tickers: string[], day: string) {
  logger.info('Processing EPS/REV data', { day, tickerCount: tickers.length });

  let processedCount = 0;
  let successCount = 0;
  const earningsDataForPublish: any[] = [];

  // For now, create mock EPS/REV data since Finnhub API key is demo
  for (const ticker of tickers) {
    try {
      // Mock data for testing
      const mockEarningsData = {
        epsEstimate: Math.random() * 5 + 0.5, // 0.5 to 5.5
        epsActual: Math.random() > 0.3 ? Math.random() * 5 + 0.5 : null, // 70% have actual
        revenueEstimate: Math.random() * 1000 + 100, // 100 to 1100M
        revenueActual: Math.random() > 0.3 ? Math.random() * 1000 + 100 : null, // 70% have actual
        hasSchedule: true,
        scheduleInferred: false,
      };

      const { epsEstimate, epsActual, revenueEstimate, revenueActual, hasSchedule, scheduleInferred } = mockEarningsData;

      await prisma.earningsDaily.upsert({
        where: {
          ticker_day: {
            ticker: ticker,
            day: new Date(day),
          },
        },
        update: {
          epsEst: epsEstimate,
          epsAct: epsActual,
          revEst: revenueEstimate,
          revAct: revenueActual,
          hasSchedule: hasSchedule,
          scheduleInferred: scheduleInferred,
          actualPending: (epsActual === null && epsEstimate !== null) || (revenueActual === null && revenueEstimate !== null),
          updatedAt: new Date(),
          source: 'mock',
        },
        create: {
          ticker: ticker,
          day: new Date(day),
          epsEst: epsEstimate,
          epsAct: epsActual,
          revEst: revenueEstimate,
          revAct: revenueActual,
          hasSchedule: hasSchedule,
          scheduleInferred: scheduleInferred,
          actualPending: (epsActual === null && epsEstimate !== null) || (revenueActual === null && revenueEstimate !== null),
          updatedAt: new Date(),
          source: 'mock',
        },
      });

      earningsDataForPublish.push({
        ticker,
        eps_est: epsEstimate,
        eps_act: epsActual,
        rev_est: revenueEstimate,
        rev_act: revenueActual,
        has_schedule: hasSchedule,
        schedule_inferred: scheduleInferred,
        actual_pending: (epsActual === null && epsEstimate !== null) || (revenueActual === null && revenueEstimate !== null),
        source: 'mock',
      });
      successCount++;
      processedCount++;
    } catch (error: any) {
      logger.error(`Error processing EPS/REV for ${ticker} on ${day}:`, error);
      processedCount++;
    }
  }

  logger.info(`EPS/REV processed ${processedCount} tickers, ${successCount} successful.`);

  // --- DQ Gate and Publish Logic ---
  const stagingKey = `earnings:${day}:staging`;
  const publishedKey = `earnings:${day}:published`;
  const metaKey = `earnings:latest:meta`;

  // Fetch existing prices data to combine for full coverage calculation
  const existingStagingData = await getJSON(stagingKey) || { data: [] };
  
  // FIXED: Start with ALL earnings tickers, then find market data for each
  const combinedData = {
    data: earningsDataForPublish.map((earningsItem: any) => {
      const priceItem = existingStagingData.data.find((p: any) => p.ticker === earningsItem.ticker);
      return { ...earningsItem, ...priceItem };
    })
  };

  const coverage = computeCoverage(day, combinedData);
  const thresholds = getCoverageThresholds();

  // Update PublishMeta in DB
  await prisma.publishMeta.upsert({
    where: { day: new Date(day) },
    update: {
      coverageSchedule: coverage.schedule,
      coveragePrice: coverage.price,
      coverageEpsrev: coverage.epsRev,
      updatedAt: new Date(),
    },
    create: {
      day: new Date(day),
      coverageSchedule: coverage.schedule,
      coveragePrice: coverage.price,
      coverageEpsrev: coverage.epsRev,
      updatedAt: new Date(),
    },
  });

  // Store combined data to staging Redis key
  await setJSON(stagingKey, {
    day: day,
    publishedAt: new Date().toISOString(), // This will be updated on actual publish
    coverage,
    data: combinedData.data,
    flags: [],
  });

  if (shouldPublish(coverage, thresholds)) {
    await renameKey(stagingKey, publishedKey);
    await setJSON(metaKey, {
      day: day,
      publishedAt: new Date().toISOString(),
      coverage,
      status: 'published',
    });
    await prisma.publishMeta.update({
      where: { day: new Date(day) },
      data: {
        status: 'published',
        publishedAt: new Date(),
      },
    });
    logger.info('DQ Gate passed: New snapshot published!', { day, coverage });
  } else {
    logger.warn('DQ Gate blocked publish for EPS/REV worker', { day, coverage, thresholds });
  }

  return {
    processed: processedCount,
    successful: successCount,
    coverage,
    published: shouldPublish(coverage, thresholds)
  };
}
