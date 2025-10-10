#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testApiQuery() {
  console.log('🧪 Testing API query logic...');
  
  const todayString = '2025-10-10';
  const start = new Date(todayString + 'T00:00:00.000Z');
  const end = new Date(todayString + 'T23:59:59.999Z');
  
  console.log('📅 Date range:', start.toISOString(), 'to', end.toISOString());
  
  const combinedRows = await prisma.earningsTickersToday.findMany({
    where: { 
      reportDate: {
        gte: start,
        lte: end
      }
    },
    select: {
      ticker: true,
      reportTime: true,
      epsActual: true,
      epsEstimate: true,
      revenueActual: true,
      revenueEstimate: true,
      sector: true,
      dataSource: true,
      fiscalPeriod: true,
      fiscalYear: true,
      companyType: true,
      primaryExchange: true,
      // Join with market data
      marketData: {
        select: {
          currentPrice: true,
          previousClose: true,
          priceChangePercent: true,
          marketCap: true,
          marketCapDiff: true,
          marketCapDiffBillions: true,
          size: true,
          companyName: true,
          companyType: true,
          primaryExchange: true,
        }
      }
    },
    orderBy: { 
      marketData: {
        marketCap: 'desc'
      }
    },
    take: 500,
  });
  
  console.log('📊 Query result count:', combinedRows.length);
  combinedRows.forEach(row => {
    console.log('  -', row.ticker, 'marketData:', row.marketData ? 'present' : 'null');
  });
  
  await prisma.$disconnect();
}

testApiQuery().catch(console.error);
