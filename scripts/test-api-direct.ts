#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testApiDirect() {
  console.log('🧪 Testing API logic directly...');
  
  const todayString = '2025-10-10';
  const start = new Date(todayString + 'T00:00:00.000Z');
  const end = new Date(todayString + 'T23:59:59.999Z');
  
  console.log('📅 Date range:', start.toISOString(), 'to', end.toISOString());
  
  // Replicate API query exactly
  let combinedRows = await prisma.earningsTickersToday.findMany({
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
  
  console.log(`[API][VERIFY] /api/earnings count=${combinedRows.length}`);
  console.log(`[API][DEBUG] combinedRows sample:`, combinedRows.slice(0, 2).map(r => ({ ticker: r.ticker, marketData: r.marketData ? 'present' : 'null' })));
  
  // Flatten the joined data structure
  const flattenedRows = combinedRows.map(row => {
    return {
      ticker: row.ticker,
      reportTime: row.reportTime,
      epsActual: row.epsActual,
      epsEstimate: row.epsEstimate,
      revenueActual: row.revenueActual,
      revenueEstimate: row.revenueEstimate,
      sector: row.sector,
      companyType: row.companyType,
      dataSource: row.dataSource,
      fiscalPeriod: row.fiscalPeriod,
      fiscalYear: row.fiscalYear,
      primaryExchange: row.primaryExchange,
      // Add market data fields (from joined marketData)
      currentPrice: row.marketData?.currentPrice ?? null,
      previousClose: row.marketData?.previousClose ?? null,
      priceChangePercent: row.marketData?.priceChangePercent ?? null,
      marketCap: row.marketData?.marketCap ?? null,
      marketCapDiff: row.marketData?.marketCapDiff ?? null,
      marketCapDiffBillions: row.marketData?.marketCapDiffBillions ?? null,
      size: row.marketData?.size ?? null,
      companyName: row.marketData?.companyName ?? row.ticker,
    }
  });
  
  console.log(`[API][FLATTEN] flattenedRows count=${flattenedRows.length}`);
  
  const filteredRows = flattenedRows; // No ticker filter
  
  const combinedData = filteredRows.map(row => {
    return {
      ticker: row.ticker,
      reportTime: row.reportTime,
      epsActual: row.epsActual,
      epsEstimate: row.epsEstimate,
      revenueActual: row.revenueActual,
      revenueEstimate: row.revenueEstimate,
      sector: row.sector,
      companyType: row.companyType,
      dataSource: row.dataSource,
      fiscalPeriod: row.fiscalPeriod,
      fiscalYear: row.fiscalYear,
      primaryExchange: row.primaryExchange,
      currentPrice: row.currentPrice,
      previousClose: row.previousClose,
      priceChangePercent: row.priceChangePercent,
      marketCap: row.marketCap,
      marketCapDiff: row.marketCapDiff,
      marketCapDiffBillions: row.marketCapDiffBillions,
      size: row.size,
      companyName: row.companyName,
    }
  });
  
  console.log(`[API][FINAL] combinedData count=${combinedData.length}`);
  console.log(`[API][FINAL] total=${combinedData.length}`);
  
  await prisma.$disconnect();
}

testApiDirect().catch(console.error);
