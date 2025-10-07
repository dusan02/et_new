import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * UPSERT earnings data - prevents empty windows between DELETE and INSERT
 */
export async function upsertEarningsData(data: {
  ticker: string;
  reportDate: Date;
  reportTime?: string | null;
  epsActual?: number | null;
  epsEstimate?: number | null;
  revenueActual?: bigint | null;
  revenueEstimate?: bigint | null;
  sector?: string | null;
  companyType?: string | null;
  dataSource?: string | null;
  sourcePriority?: number | null;
  fiscalPeriod?: string | null;
  fiscalYear?: number | null;
  primaryExchange?: string | null;
}) {
  return await prisma.earningsTickersToday.upsert({
    where: {
      ticker_reportDate_unique: {
        ticker: data.ticker,
        reportDate: data.reportDate
      }
    },
    create: {
      ticker: data.ticker,
      reportDate: data.reportDate,
      reportTime: data.reportTime,
      epsActual: data.epsActual,
      epsEstimate: data.epsEstimate,
      revenueActual: data.revenueActual,
      revenueEstimate: data.revenueEstimate,
      sector: data.sector,
      companyType: data.companyType,
      dataSource: data.dataSource,
      sourcePriority: data.sourcePriority,
      fiscalPeriod: data.fiscalPeriod,
      fiscalYear: data.fiscalYear,
      primaryExchange: data.primaryExchange,
    },
    update: {
      reportTime: data.reportTime,
      epsActual: data.epsActual,
      epsEstimate: data.epsEstimate,
      revenueActual: data.revenueActual,
      revenueEstimate: data.revenueEstimate,
      sector: data.sector,
      companyType: data.companyType,
      dataSource: data.dataSource,
      sourcePriority: data.sourcePriority,
      fiscalPeriod: data.fiscalPeriod,
      fiscalYear: data.fiscalYear,
      primaryExchange: data.primaryExchange,
      updatedAt: new Date()
    }
  });
}

/**
 * UPSERT market data - prevents empty windows between DELETE and INSERT
 */
export async function upsertMarketData(data: {
  ticker: string;
  reportDate: Date;
  companyName?: string | null;
  currentPrice?: number | null;
  previousClose?: number | null;
  priceChangePercent?: number | null;
  marketCap?: number | null;
  size?: string | null;
  marketCapDiff?: number | null;
  marketCapDiffBillions?: number | null;
  sharesOutstanding?: number | null;
  companyType?: string | null;
  primaryExchange?: string | null;
}) {
  return await prisma.marketData.upsert({
    where: {
      ticker_reportDate: {
        ticker: data.ticker,
        reportDate: data.reportDate
      }
    },
    create: {
      ticker: data.ticker,
      reportDate: data.reportDate,
      companyName: data.companyName,
      currentPrice: data.currentPrice,
      previousClose: data.previousClose,
      priceChangePercent: data.priceChangePercent,
      marketCap: data.marketCap,
      size: data.size,
      marketCapDiff: data.marketCapDiff,
      marketCapDiffBillions: data.marketCapDiffBillions,
      sharesOutstanding: data.sharesOutstanding,
      companyType: data.companyType,
      primaryExchange: data.primaryExchange,
    },
    update: {
      companyName: data.companyName,
      currentPrice: data.currentPrice,
      previousClose: data.previousClose,
      priceChangePercent: data.priceChangePercent,
      marketCap: data.marketCap,
      size: data.size,
      marketCapDiff: data.marketCapDiff,
      marketCapDiffBillions: data.marketCapDiffBillions,
      sharesOutstanding: data.sharesOutstanding,
      companyType: data.companyType,
      primaryExchange: data.primaryExchange,
      updatedAt: new Date()
    }
  });
}

/**
 * UPSERT movements data - prevents empty windows between DELETE and INSERT
 */
export async function upsertMovementsData(data: {
  ticker: string;
  reportDate: Date;
  companyName: string;
  currentPrice?: number | null;
  previousClose?: number | null;
  marketCap?: bigint | null;
  size?: string | null;
  marketCapDiff?: number | null;
  marketCapDiffBillions?: number | null;
  priceChangePercent?: number | null;
  sharesOutstanding?: bigint | null;
  companyType?: string | null;
  primaryExchange?: string | null;
  reportTime?: string | null;
}) {
  return await prisma.todayEarningsMovements.upsert({
    where: {
      movements_ticker_reportDate_unique: {
        ticker: data.ticker,
        reportDate: data.reportDate
      }
    },
    create: {
      ticker: data.ticker,
      reportDate: data.reportDate,
      companyName: data.companyName,
      currentPrice: data.currentPrice,
      previousClose: data.previousClose,
      marketCap: data.marketCap,
      size: data.size,
      marketCapDiff: data.marketCapDiff,
      marketCapDiffBillions: data.marketCapDiffBillions,
      priceChangePercent: data.priceChangePercent,
      sharesOutstanding: data.sharesOutstanding,
      companyType: data.companyType,
      primaryExchange: data.primaryExchange,
      reportTime: data.reportTime,
    },
    update: {
      companyName: data.companyName,
      currentPrice: data.currentPrice,
      previousClose: data.previousClose,
      marketCap: data.marketCap,
      size: data.size,
      marketCapDiff: data.marketCapDiff,
      marketCapDiffBillions: data.marketCapDiffBillions,
      priceChangePercent: data.priceChangePercent,
      sharesOutstanding: data.sharesOutstanding,
      companyType: data.companyType,
      primaryExchange: data.primaryExchange,
      reportTime: data.reportTime,
      updatedAt: new Date()
    }
  });
}

/**
 * Batch UPSERT operations for better performance
 */
export async function batchUpsertEarningsData(earningsData: Array<Parameters<typeof upsertEarningsData>[0]>) {
  const results = [];
  
  for (const data of earningsData) {
    try {
      const result = await upsertEarningsData(data);
      results.push({ success: true, ticker: data.ticker, result });
    } catch (error) {
      console.error(`❌ Failed to upsert earnings for ${data.ticker}:`, error);
      results.push({ success: false, ticker: data.ticker, error });
    }
  }
  
  return results;
}

export async function batchUpsertMarketData(marketData: Array<Parameters<typeof upsertMarketData>[0]>) {
  const results = [];
  
  for (const data of marketData) {
    try {
      const result = await upsertMarketData(data);
      results.push({ success: true, ticker: data.ticker, result });
    } catch (error) {
      console.error(`❌ Failed to upsert market data for ${data.ticker}:`, error);
      results.push({ success: false, ticker: data.ticker, error });
    }
  }
  
  return results;
}
