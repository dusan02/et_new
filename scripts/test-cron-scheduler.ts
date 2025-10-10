#!/usr/bin/env tsx

/**
 * 🧪 CRON SCHEDULER TEST
 * 
 * Tento skript testuje cron scheduler funkcie
 */

import { PrismaClient } from '@prisma/client'
import { format } from 'date-fns'

const prisma = new PrismaClient()

async function getTodaysTickers(): Promise<string[]> {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // 🧩 [CRON][SELECT] Log source and date
  console.log(`[CRON][SELECT] date=${today}, tz=America/New_York, source=EarningsTickersToday`);
  
  // ✅ FIX: Use timezone-aware date range instead of exact time
  const start = new Date(today + 'T00:00:00.000Z'); // Start of day UTC
  const end = new Date(today + 'T23:59:59.999Z');   // End of day UTC
  
  const tickers = await prisma.earningsTickersToday.findMany({
    where: {
      reportDate: {
        gte: start,
        lte: end
      }
    },
    select: {
      ticker: true,
    },
  });
  
  const tickerList = tickers.map(t => t.ticker);
  console.log(`[CRON][RUN] symbols=[${tickerList.join(', ')}] count=${tickerList.length}`);
  
  return tickerList;
}

async function testCronScheduler() {
  try {
    console.log('🧪 Testing cron scheduler getTodaysTickers function...');
    
    const tickers = await getTodaysTickers();
    
    if (tickers.length === 0) {
      console.error('❌ [CRON-TEST] FAILED: No tickers found!');
      process.exit(1);
    }
    
    console.log(`✅ [CRON-TEST] PASSED: Found ${tickers.length} tickers`);
    console.log(`🎯 [CRON-TEST] Tickers: [${tickers.join(', ')}]`);
    
  } catch (error) {
    console.error('❌ [CRON-TEST] ERROR:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Spusti ak je volaný priamo
if (require.main === module) {
  testCronScheduler();
}
