/**
 * 🚀 BENZINGA GUIDANCE FETCHER
 * 
 * Fetchuje guidance dáta z Benzinga Corporate Guidance API (cez Polygon)
 * - Paralelné spracovanie tickerov
 * - Smart period detection
 * - Hybrid guidance calculation
 */

import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../server/utils/logger';
import { detectGuidancePeriod, calculateGuidanceSurprise } from '../../utils/guidanceLogic';

const prisma = new PrismaClient();

interface BenzingaGuidanceResponse {
  results: Array<{
    ticker: string;
    company_name: string;
    date: string;
    time: string;
    fiscal_period: string;
    fiscal_year: number;
    release_type: string;
    positioning: string;
    importance: number;
    estimated_eps_guidance: number | null;
    min_eps_guidance: number | null;
    max_eps_guidance: number | null;
    eps_method: string;
    estimated_revenue_guidance: number | null;
    min_revenue_guidance: number | null;
    max_revenue_guidance: number | null;
    revenue_method: string;
    previous_min_eps_guidance: number | null;
    previous_max_eps_guidance: number | null;
    previous_min_revenue_guidance: number | null;
    previous_max_revenue_guidance: number | null;
    currency: string;
    notes: string | null;
    id: string;
    last_updated: string;
  }>;
}

export async function fetchBenzingaGuidance() {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    logger.info(`Fetching Benzinga guidance data for ${todayStr}`);

    // Get tickers from earnings data
    const tickers = await getTickersFromEarnings(todayStr);
    if (tickers.length === 0) {
      logger.info('No tickers found for guidance fetch');
      return { count: 0, message: 'No tickers found' };
    }

    logger.info(`Found ${tickers.length} tickers for guidance fetch`);

    // Fetch guidance data in parallel
    const guidanceData = await fetchGuidanceDataParallel(tickers);
    
    // Process and save guidance data
    if (guidanceData.length > 0) {
      const savedCount = await saveGuidanceData(guidanceData, todayStr);
      logger.info(`Successfully saved ${savedCount} guidance records`);
      return { count: savedCount };
    }

    return { count: 0, message: 'No guidance data found' };
  } catch (error) {
    logger.error('Error fetching Benzinga guidance:', error);
    throw error;
  }
}

/**
 * Get tickers from earnings data
 */
async function getTickersFromEarnings(date: string): Promise<string[]> {
  const earnings = await prisma.earningsTickersToday.findMany({
    where: {
      reportDate: {
        gte: new Date(date),
        lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
      }
    },
    select: {
      ticker: true
    }
  });

  return earnings.map(e => e.ticker);
}

/**
 * Fetch guidance data in parallel for multiple tickers
 */
async function fetchGuidanceDataParallel(tickers: string[]): Promise<any[]> {
  const batchSize = 10; // Process 10 tickers at a time
  const allGuidanceData: any[] = [];

  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    
    const promises = batch.map(async (ticker) => {
      try {
        const guidanceData = await fetchTickerGuidance(ticker);
        return guidanceData;
      } catch (error) {
        logger.error(`Failed to fetch guidance for ${ticker}:`, error);
        return null;
      }
    });

    const batchResults = await Promise.allSettled(promises);
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        allGuidanceData.push(...result.value);
      }
    }

    // Rate limiting delay
    if (i + batchSize < tickers.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return allGuidanceData;
}

/**
 * Fetch guidance data for a single ticker
 */
async function fetchTickerGuidance(ticker: string): Promise<any[]> {
  const apiKey = process.env.POLYGON_API_KEY || 'Vi_pMLcusE8RA_SUvkPAmiyziVzlmOoX';
  
  const response = await axios.get<BenzingaGuidanceResponse>(
    `https://api.polygon.io/benzinga/v1/guidance`,
    {
      params: {
        apiKey,
        ticker,
        limit: 10,
        sort: 'date.desc'
      },
      timeout: 30000,
    }
  );

  if (!response.data.results) {
    return [];
  }

  return response.data.results.map(guidance => processGuidanceRecord(guidance));
}

/**
 * Process a single guidance record
 */
function processGuidanceRecord(guidance: any): any {
  return {
    ticker: guidance.ticker,
    companyName: guidance.company_name,
    date: guidance.date,
    time: guidance.time,
    fiscalPeriod: guidance.fiscal_period,
    fiscalYear: guidance.fiscal_year,
    releaseType: guidance.release_type,
    positioning: guidance.positioning,
    importance: guidance.importance,
    estimatedEpsGuidance: guidance.estimated_eps_guidance,
    minEpsGuidance: guidance.min_eps_guidance,
    maxEpsGuidance: guidance.max_eps_guidance,
    epsMethod: guidance.eps_method,
    estimatedRevenueGuidance: guidance.estimated_revenue_guidance ? BigInt(guidance.estimated_revenue_guidance) : null,
    minRevenueGuidance: guidance.min_revenue_guidance ? BigInt(guidance.min_revenue_guidance) : null,
    maxRevenueGuidance: guidance.max_revenue_guidance ? BigInt(guidance.max_revenue_guidance) : null,
    revenueMethod: guidance.revenue_method,
    previousMinEpsGuidance: guidance.previous_min_eps_guidance,
    previousMaxEpsGuidance: guidance.previous_max_eps_guidance,
    previousMinRevenueGuidance: guidance.previous_min_revenue_guidance ? BigInt(guidance.previous_min_revenue_guidance) : null,
    previousMaxRevenueGuidance: guidance.previous_max_revenue_guidance ? BigInt(guidance.previous_max_revenue_guidance) : null,
    currency: guidance.currency,
    notes: guidance.notes,
    benzingaId: guidance.id,
    lastUpdated: guidance.last_updated
  };
}

/**
 * Save guidance data to database with hybrid calculation
 */
async function saveGuidanceData(guidanceData: any[], date: string): Promise<number> {
  let savedCount = 0;

  for (const guidance of guidanceData) {
    try {
      // Get existing earnings data for this ticker
      const existingEarnings = await prisma.earningsTickersToday.findFirst({
        where: {
          ticker: guidance.ticker,
          reportDate: {
            gte: new Date(date),
            lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
          }
        }
      });

      if (!existingEarnings) {
        logger.warn(`No earnings data found for ticker ${guidance.ticker}`);
        continue;
      }

      // Apply smart period detection
      const epsDetection = existingEarnings.epsActual && guidance.estimatedEpsGuidance
        ? detectGuidancePeriod(existingEarnings.epsActual, guidance.estimatedEpsGuidance)
        : { adjustedGuidance: guidance.estimatedEpsGuidance, period: 'unknown', confidence: 0 };

      const revenueDetection = existingEarnings.revenueActual && guidance.estimatedRevenueGuidance
        ? detectGuidancePeriod(existingEarnings.revenueActual, guidance.estimatedRevenueGuidance)
        : { adjustedGuidance: guidance.estimatedRevenueGuidance, period: 'unknown', confidence: 0 };

      // Calculate guidance surprise using hybrid logic
      const guidanceResult = calculateGuidanceSurprise(
        existingEarnings.epsActual,
        existingEarnings.epsEstimate,
        {
          epsGuidance: epsDetection.adjustedGuidance as number,
          revenueGuidance: revenueDetection.adjustedGuidance as bigint,
          guidancePeriod: epsDetection.period,
          guidanceConfidence: epsDetection.confidence,
          guidanceSource: 'benzinga',
          guidanceMethod: guidance.epsMethod,
          previousMinEpsGuidance: guidance.previousMinEpsGuidance,
          previousMaxEpsGuidance: guidance.previousMaxEpsGuidance,
          previousMinRevenueGuidance: guidance.previousMinRevenueGuidance,
          previousMaxRevenueGuidance: guidance.previousMaxRevenueGuidance
        }
      );

      // Update earnings record with guidance data
      await prisma.earningsTickersToday.update({
        where: { id: existingEarnings.id },
        data: {
          epsGuidance: epsDetection.adjustedGuidance as number,
          revenueGuidance: revenueDetection.adjustedGuidance as bigint,
          guidancePeriod: epsDetection.period,
          guidanceConfidence: epsDetection.confidence,
          guidanceSource: 'benzinga',
          guidanceMethod: guidance.epsMethod,
          previousMinEpsGuidance: guidance.previousMinEpsGuidance,
          previousMaxEpsGuidance: guidance.previousMaxEpsGuidance,
          previousMinRevenueGuidance: guidance.previousMinRevenueGuidance,
          previousMaxRevenueGuidance: guidance.previousMaxRevenueGuidance,
          epsGuideSurprise: guidanceResult.epsGuideSurprise,
          epsGuideBasis: guidanceResult.epsGuideBasis,
          epsGuideExtreme: guidanceResult.epsGuideExtreme,
          revenueGuideSurprise: guidanceResult.revenueGuideSurprise,
          revenueGuideBasis: guidanceResult.revenueGuideBasis,
          revenueGuideExtreme: guidanceResult.revenueGuideExtreme
        }
      });

      savedCount++;

      // Log warnings if any
      if (guidanceResult.warnings.length > 0) {
        logger.warn(`Guidance warnings for ${guidance.ticker}: ${guidanceResult.warnings.join(', ')}`);
      }

      // Log extreme values
      if (guidanceResult.epsGuideExtreme) {
        logger.warn(`EXTREME EPS guidance for ${guidance.ticker}: ${guidanceResult.epsGuideSurprise}%`);
      }
      if (guidanceResult.revenueGuideExtreme) {
        logger.warn(`EXTREME Revenue guidance for ${guidance.ticker}: ${guidanceResult.revenueGuideSurprise}%`);
      }

    } catch (error) {
      logger.error(`Failed to save guidance for ${guidance.ticker}:`, error);
    }
  }

  return savedCount;
}
