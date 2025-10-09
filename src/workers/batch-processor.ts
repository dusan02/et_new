import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger';
import { setJSON, getJSON, renameKey } from '../lib/redis';
import { shouldPublish, computeCoverage, getCoverageThresholds } from '../lib/dq-gate';
import { PolygonProvider } from '../lib/providers/polygon';

const prisma = new PrismaClient();
const polygonProvider = new PolygonProvider(process.env.POLYGON_API_KEY || 'demo_key');

/**
 * Check if ticker is from major US exchanges (exclude OTC/foreign)
 */
function isMajorExchangeTicker(ticker: string): boolean {
  // Exclude OTC and foreign suffixes
  const excludePatterns = [
    /\.F$/,    // Frankfurt
    /\.Y$/,    // Y suffix
    /\.PK$/,   // Pink sheets
    /\.OB$/,   // OTC Bulletin Board
    /\.V$/,    // Venture
    /-W$/,     // Warrant
    /\.A$/,    // Class A
    /\.B$/,    // Class B
    /\.C$/,    // Class C
    /\.D$/,    // Class D
    /\.E$/,    // Class E
    /\.F$/,    // Class F
    /\.G$/,    // Class G
    /\.H$/,    // Class H
    /\.I$/,    // Class I
    /\.J$/,    // Class J
    /\.K$/,    // Class K
    /\.L$/,    // Class L
    /\.M$/,    // Class M
    /\.N$/,    // Class N
    /\.O$/,    // Class O
    /\.P$/,    // Class P
    /\.Q$/,    // Class Q
    /\.R$/,    // Class R
    /\.S$/,    // Class S
    /\.T$/,    // Class T
    /\.U$/,    // Class U
    /\.V$/,    // Class V
    /\.W$/,    // Class W
    /\.X$/,    // Class X
    /\.Y$/,    // Class Y
    /\.Z$/,    // Class Z
  ];
  
  return !excludePatterns.some(pattern => pattern.test(ticker));
}

/**
 * Track tickers that should be excluded from coverage calculation
 */
const excludeFromCoverage = new Set<string>();

/**
 * Process prices batch (replaces BullMQ worker)
 */
export async function processPricesBatch(tickers: string[], day: string): Promise<void> {
  logger.info('Processing prices batch', { day, tickerCount: tickers.length });

  const dayDate = new Date(day);
  let processedCount = 0;
  let successCount = 0;
  const processedData: any[] = [];

  try {
    // 1. Filter tickers to major exchanges only
    const majorExchangeTickers = tickers.filter(isMajorExchangeTicker);
    logger.info('Filtered tickers for major exchanges', { 
      original: tickers.length, 
      filtered: majorExchangeTickers.length,
      excluded: tickers.length - majorExchangeTickers.length
    });

    // 2. Fetch snapshot data from Polygon
    const snapshotData = await polygonProvider.getSnapshotTickers(majorExchangeTickers);
    
    // 2. Normalize and upsert to database
    for (const data of snapshotData) {
      try {
        // Mark tickers with not_found flag for exclusion from coverage
        if (data.flags?.includes('not_found')) {
          excludeFromCoverage.add(data.ticker);
        }

        await prisma.pricesDaily.upsert({
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
            priceStale: data.flags?.includes('price_stale') || false,
            source: data.source,
            updatedAt: new Date()
          },
          create: {
            ticker: data.ticker,
            day: dayDate,
            last: data.last,
            marketCap: data.marketCap,
            sharesOutstanding: data.sharesOutstanding,
            priceStale: data.flags?.includes('price_stale') || false,
            source: data.source
          }
        });
        successCount++;
        processedData.push(data);
      } catch (error: any) {
        logger.error(`Error upserting price for ${data.ticker}:`, error);
      }
      processedCount++;
    }
    
    logger.info('Prices batch processed', {
      day,
      processed: processedCount,
      successful: successCount
    });

    // 3. Create staging payload with processed data
    const stagingPayload = {
      day,
      publishedAt: new Date().toISOString(),
      coverage: {
        schedule: 0, // Will be calculated in Sprint 3
        price: 0, // Will be calculated by computeCoverage
        epsRev: 0 // Will be calculated in Sprint 3
      },
      data: processedData.map(d => ({
        ticker: d.ticker,
        last_price: d.last,
        market_cap: d.marketCap,
        shares_outstanding: d.sharesOutstanding,
        price_stale: d.flags?.includes('price_stale') || false,
        source: d.source,
        flags: d.flags || [],
        updated_at: new Date().toISOString()
      })),
      flags: ['prices_worker', 'polygon_source']
    };

    // 4. Calculate coverage with exclusion logic
    const coverage = computeCoverage(day, stagingPayload, excludeFromCoverage);
    stagingPayload.coverage = coverage;

    // 5. Save to staging
    const stagingKey = `earnings:${day}:staging`;
    await setJSON(stagingKey, stagingPayload);

    // 6. Update publish metadata
    await prisma.publishMeta.upsert({
      where: { day: dayDate },
      update: {
        coveragePrice: coverage.price,
        updatedAt: new Date()
      },
      create: {
        day: dayDate,
        coveragePrice: coverage.price,
        status: 'staging'
      }
    });

    // 7. Check DQ gate and publish if passes
    if (shouldPublish(coverage, getCoverageThresholds())) {
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

  } catch (error: any) {
    logger.error('Error processing prices batch:', error);
    throw error;
  } finally {
    // Graceful shutdown for one-shot scripts
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      logger.warn('Error disconnecting Prisma:', disconnectError);
    }
  }
}

/**
 * Process EPS/REV batch (replaces BullMQ worker)
 */
export async function processEpsRevBatch(tickers: string[], day: string): Promise<void> {
  logger.info('Processing EPS/REV batch', { day, tickerCount: tickers.length });

  const dayDate = new Date(day);
  let processedCount = 0;
  let successCount = 0;
  const earningsDataForPublish: any[] = [];

  try {
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
              day: dayDate,
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
            day: dayDate,
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
      } catch (error: any) {
        logger.error(`Error processing EPS/REV for ${ticker}:`, error);
      }
      processedCount++;
    }

    logger.info(`EPS/REV batch processed ${processedCount} tickers, ${successCount} successful.`);

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
      where: { day: dayDate },
      update: {
        coverageSchedule: coverage.schedule,
        coveragePrice: coverage.price,
        coverageEpsrev: coverage.epsRev,
        updatedAt: new Date(),
      },
      create: {
        day: dayDate,
        coverageSchedule: coverage.schedule,
        coveragePrice: coverage.price,
        coverageEpsrev: coverage.epsRev,
        updatedAt: new Date(),
      },
    });

    // Store combined data to staging Redis key
    await setJSON(stagingKey, {
      day: day,
      publishedAt: new Date().toISOString(),
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
        where: { day: dayDate },
        data: {
          status: 'published',
          publishedAt: new Date(),
        },
      });
      logger.info('DQ Gate passed: New snapshot published!', { day, coverage });
    } else {
      logger.warn('DQ Gate blocked publish for EPS/REV worker', { day, coverage, thresholds });
    }

  } catch (error: any) {
    logger.error('Error processing EPS/REV batch:', error);
    throw error;
  } finally {
    // Graceful shutdown for one-shot scripts
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      logger.warn('Error disconnecting Prisma:', disconnectError);
    }
  }
}

