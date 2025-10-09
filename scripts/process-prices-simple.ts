#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PolygonProvider } from '../src/lib/providers/polygon';
import { setJSON, renameKey } from '../src/lib/redis';
import { logger } from '../src/lib/logger';
import { shouldPublish } from '../src/lib/dq-gate';

// Load environment variables
config();

const prisma = new PrismaClient();
const polygonProvider = new PolygonProvider(process.env.POLYGON_API_KEY || 'demo_key');

/**
 * Process prices for today's tickers (simple version without BullMQ)
 */
async function processPricesSimple(): Promise<void> {
  try {
    // Get today's date in US/Eastern timezone
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const today = easternTime.toISOString().split('T')[0];
    const todayDate = new Date(today);

    logger.info('Processing prices (simple)', { day: today });

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

    logger.info('Fetching prices from Polygon', { tickersCount: tickers.length });

    // Fetch snapshot data from Polygon
    const snapshotData = await polygonProvider.getSnapshotTickers(tickers);
    
    // Upsert to database
    const upsertPromises = snapshotData.map(async (data) => {
      return prisma.pricesDaily.upsert({
        where: {
          ticker_day: {
            ticker: data.ticker,
            day: todayDate
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
          day: todayDate,
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
      day: today,
      upserted: snapshotData.length
    });

    // Calculate coverage
    const totalTickers = tickers.length;
    const tickersWithPrice = snapshotData.filter(d => d.last !== null).length;
    const coveragePrice = totalTickers > 0 ? Math.round((tickersWithPrice / totalTickers) * 100) : 0;

    // Create staging payload
    const stagingPayload = {
      day: today,
      publishedAt: new Date().toISOString(),
      coverage: {
        schedule: 0, // Sprint 3
        price: coveragePrice,
        epsRev: 0 // Sprint 3
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

    // Save to staging
    const stagingKey = `earnings:${today}:staging`;
    await setJSON(stagingKey, stagingPayload);

    // Update publish metadata
    await prisma.publishMeta.upsert({
      where: { day: todayDate },
      update: {
        coveragePrice,
        updatedAt: new Date()
      },
      create: {
        day: todayDate,
        coveragePrice,
        status: 'staging'
      }
    });

    // Check DQ gate and publish if passes
    const coverage = {
      schedule: 0, // Sprint 3
      price: coveragePrice,
      epsRev: 0 // Sprint 3
    };

    if (shouldPublish(coverage)) {
      // Atomic rename staging -> published
      const publishedKey = `earnings:${today}:published`;
      const metaKey = 'earnings:latest:meta';
      
      await renameKey(stagingKey, publishedKey);
      await setJSON(metaKey, {
        day: today,
        publishedAt: stagingPayload.publishedAt,
        coverage: stagingPayload.coverage,
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
        dataCount: stagingPayload.data.length
      });

      console.log('✅ Prices processed and published successfully!');
      console.log(`📊 Coverage: ${coveragePrice}%`);
      console.log(`📈 Data: ${stagingPayload.data.length} tickers`);
    } else {
      logger.info('DQ gate blocked publish', {
        day: today,
        coverage,
        threshold: { schedule: 95, price: 98, epsRev: 90 }
      });

      console.log('⚠️ Prices processed but not published (coverage too low)');
      console.log(`📊 Coverage: ${coveragePrice}% (need 98%)`);
    }

  } catch (error) {
    logger.error('Error processing prices:', error);
    console.error('❌ Failed to process prices:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  processPricesSimple()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { processPricesSimple };
