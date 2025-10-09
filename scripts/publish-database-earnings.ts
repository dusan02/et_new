#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { setJSON, initRedis } from '../src/lib/redis';
import { logger } from '../src/lib/logger';
import { PrismaClient } from '@prisma/client';

// Load environment variables
config();

const prisma = new PrismaClient();

interface PublishedData {
  status: string;
  source: string;
  day: string;
  freshness: {
    ageMinutes: number;
    publishedAt: string;
  };
  coverage: {
    schedule: number;
    price: number;
    epsRev: number;
  };
  data: any[];
  flags: string[];
}

/**
 * Publish real earnings data from database to Redis
 */
async function publishDatabaseEarnings(): Promise<void> {
  try {
    // Initialize Redis connection
    initRedis();
    
    // Get today's date in US/Eastern timezone
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const today = new Date(Date.UTC(easternTime.getFullYear(), easternTime.getMonth(), easternTime.getDate()));
    
    logger.info('Publishing database earnings data', { 
      day: today.toISOString().split('T')[0]
    });

    // Get earnings data from database
    const earningsData = await prisma.earningsTickersToday.findMany({
      where: { reportDate: today },
      include: {
        marketData: true
      }
    });

    if (earningsData.length === 0) {
      logger.warn('No earnings data found for today', { day: today.toISOString().split('T')[0] });
      return;
    }

    // Transform data for API response
    const transformedData = earningsData.map(earning => {
      const marketData = earning.marketData;
      
      return {
        ticker: earning.ticker,
        name: marketData?.companyName || earning.ticker,
        exchange: marketData?.primaryExchange || 'Unknown',
        last_price: marketData?.currentPrice || null,
        price_change_percent: marketData?.priceChangePercent || null,
        market_cap: marketData?.marketCap || null,
        marketCapDiffBillions: marketData?.marketCapDiffBillions || null,
        shares_outstanding: marketData?.sharesOutstanding || null,
        price_stale: false,
        has_schedule: true,
        schedule_inferred: false,
        eps_est: earning.epsEstimate,
        eps_act: earning.epsActual,
        rev_est: earning.revenueEstimate ? Number(earning.revenueEstimate) : null,
        rev_act: earning.revenueActual ? Number(earning.revenueActual) : null,
        actual_pending: !earning.epsActual && !earning.revenueActual,
        source: earning.dataSource || 'finnhub',
        updated_at: earning.updatedAt.toISOString(),
        report_time: earning.reportTime || 'TNS',
        sector: earning.sector || 'Unknown'
      };
    });

    // Calculate coverage
    const totalCount = transformedData.length;
    const withSchedule = transformedData.filter(d => d.has_schedule).length;
    const withPrice = transformedData.filter(d => d.last_price !== null).length;
    const withEpsRev = transformedData.filter(d => d.eps_est !== null || d.rev_est !== null).length;

    const coverage = {
      schedule: totalCount > 0 ? Math.round((withSchedule / totalCount) * 100) : 0,
      price: totalCount > 0 ? Math.round((withPrice / totalCount) * 100) : 0,
      epsRev: totalCount > 0 ? Math.round((withEpsRev / totalCount) * 100) : 0
    };

    const publishedData: PublishedData = {
      status: "success",
      source: "redis",
      day: today.toISOString().split('T')[0],
      freshness: {
        ageMinutes: 0,
        publishedAt: now.toISOString()
      },
      coverage,
      data: transformedData,
      flags: ["real_data", "today_earnings", "database_source"]
    };

    const metaData = {
      day: today.toISOString().split('T')[0],
      publishedAt: now.toISOString(),
      coverage,
      status: "published"
    };
    
    // Publish to Redis
    const publishedKey = `earnings:${today.toISOString().split('T')[0]}:published`;
    const metaKey = 'earnings:latest:meta';
    
    await setJSON(publishedKey, publishedData);
    await setJSON(metaKey, metaData);
    
    logger.info('Database earnings data published successfully', {
      day: today.toISOString().split('T')[0],
      dataCount: transformedData.length,
      coverage,
      keys: [publishedKey, metaKey]
    });

    console.log('✅ Successfully published database earnings data!');
    console.log(`📊 Published ${transformedData.length} companies for ${today.toISOString().split('T')[0]}`);
    console.log(`📈 Coverage: Schedule ${coverage.schedule}%, Price ${coverage.price}%, EPS/Rev ${coverage.epsRev}%`);
    console.log(`🔑 Redis keys: ${publishedKey}, ${metaKey}`);

  } catch (error) {
    logger.error('Failed to publish database earnings data:', error);
    console.error('❌ Failed to publish database earnings data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  publishDatabaseEarnings()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { publishDatabaseEarnings };
