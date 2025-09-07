import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { logger } from '../../server/utils/logger';

const prisma = new PrismaClient();

interface FinnhubEarningsResponse {
  symbol: string;
  date: string;
  hour: string;
  year: number;
  quarter: number;
  epsEstimate?: number;
  epsActual?: number;
  revenueEstimate?: number;
  revenueActual?: number;
}

interface PolygonTickerResponse {
  ticker: string;
  name: string;
  market: string;
  locale: string;
  primary_exchange: string;
  type: string;
  active: boolean;
  currency_name: string;
  cik?: string;
  composite_figi?: string;
  share_class_figi?: string;
  last_updated_utc: string;
}

export async function fetchEarningsData() {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    logger.info(`Fetching earnings data for ${todayStr}`);

    // Fetch from Finnhub
    const finnhubResponse = await axios.get<FinnhubEarningsResponse[]>(
      `https://finnhub.io/api/v1/calendar/earnings`,
      {
        params: {
          token: process.env.FINNHUB_API_KEY || 'd2m1rr1r01qgtft6ppjgd2m1rr1r01qgtft6ppk0',
          from: todayStr,
          to: todayStr,
        },
        timeout: 30000,
      }
    );

    const earningsData = finnhubResponse.data || [];
    logger.info(`Fetched ${earningsData.length} earnings records from Finnhub`);

    // Process and save earnings data
    const processedData = earningsData.map(earning => ({
      reportDate: new Date(earning.date),
      ticker: earning.symbol,
      reportTime: earning.hour === 'bmo' ? 'BMO' : earning.hour === 'amc' ? 'AMC' : 'TNS',
      epsActual: earning.epsActual ? parseFloat(earning.epsActual.toString()) : null,
      epsEstimate: earning.epsEstimate ? parseFloat(earning.epsEstimate.toString()) : null,
      revenueActual: earning.revenueActual ? BigInt(earning.revenueActual) : null,
      revenueEstimate: earning.revenueEstimate ? BigInt(earning.revenueEstimate) : null,
      sector: null, // Will be fetched separately
    }));

    // Bulk upsert earnings data
    let upsertCount = 0;
    for (const data of processedData) {
      try {
        await prisma.earningsTickersToday.upsert({
          where: {
            reportDate_ticker: {
              reportDate: data.reportDate,
              ticker: data.ticker,
            },
          },
          update: {
            reportTime: data.reportTime,
            epsActual: data.epsActual,
            epsEstimate: data.epsEstimate,
            revenueActual: data.revenueActual,
            revenueEstimate: data.revenueEstimate,
            sector: data.sector,
            updatedAt: new Date(),
          },
          create: data,
        });
        upsertCount++;
      } catch (error) {
        logger.error(`Error upserting earnings data for ${data.ticker}:`, error);
      }
    }

    // Fetch additional ticker data from Polygon if needed
    if (processedData.length > 0) {
      await fetchAdditionalTickerData(processedData.map(d => d.ticker));
    }

    logger.info(`Successfully processed ${upsertCount} earnings records`);
    return { count: upsertCount, date: todayStr };
  } catch (error) {
    logger.error('Error fetching earnings data:', error);
    throw error;
  }
}

async function fetchAdditionalTickerData(tickers: string[]) {
  try {
    const batchSize = 10; // Process in batches to avoid rate limits
    const batches = [];
    
    for (let i = 0; i < tickers.length; i += batchSize) {
      batches.push(tickers.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const promises = batch.map(async (ticker) => {
        try {
          const response = await axios.get<PolygonTickerResponse>(
            `https://api.polygon.io/v3/reference/tickers/${ticker}`,
            {
              params: {
                apikey: process.env.POLYGON_API_KEY || 'Vi_pMLcusE8RA_SUvkPAmiyziVzlmOoX',
              },
              timeout: 10000,
            }
          );

          const tickerData = response.data.results;
          if (tickerData) {
            // Update sector information if available
            await prisma.earningsTickersToday.updateMany({
              where: {
                ticker: ticker,
                reportDate: new Date(),
              },
              data: {
                sector: tickerData.type || null,
              },
            });
          }
        } catch (error) {
          logger.warn(`Failed to fetch additional data for ${ticker}:`, error);
        }
      });

      await Promise.allSettled(promises);
      
      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    logger.error('Error fetching additional ticker data:', error);
  }
}
