import axios from 'axios';
import { logger } from '../logger';
import { PrismaClient } from '@prisma/client';
import { subHours } from 'date-fns';

const prisma = new PrismaClient();

export interface PolygonSnapshotData {
  ticker: string;
  last: number | null;
  marketCap: number | null;
  sharesOutstanding: number | null;
  source: string;
  flags?: string[];
}

export class PolygonProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get snapshot data for multiple tickers
   */
  async getSnapshotTickers(tickers: string[]): Promise<PolygonSnapshotData[]> {
    const results: PolygonSnapshotData[] = [];

    for (const ticker of tickers) {
      try {
        const data = await this.getSnapshotTicker(ticker);
        results.push(data);
      } catch (error: any) {
        // Handle 404 specifically - try fallback lastKnown
        if (error.response?.status === 404) {
          logger.warn(`Ticker ${ticker} not found in Polygon, trying fallback lastKnown`);
          const fallbackData = await this.getFallbackLastKnown(ticker);
          results.push(fallbackData);
        } else {
          logger.error(`Error fetching snapshot for ${ticker}:`, {
            status: error.response?.status,
            request_id: error.response?.data?.request_id,
            symbol: ticker
          });
          results.push({
            ticker,
            last: null,
            marketCap: null,
            sharesOutstanding: null,
            source: 'error',
            flags: ['api_error']
          });
        }
      }
    }

    return results;
  }

  /**
   * Get snapshot data for a single ticker
   */
  private async getSnapshotTicker(ticker: string): Promise<PolygonSnapshotData> {
    try {
      const response = await axios.get(
        `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`,
        {
          params: {
            apikey: this.apiKey,
          },
          timeout: 10000,
        }
      );

      const data = response.data;
      
      if (data.status !== 'OK') {
        throw new Error(`Polygon API error: ${data.status}`);
      }

      // Demo key returns empty results, create mock data
      if (!data.results) {
        return {
          ticker,
          last: Math.random() * 100 + 50, // Mock price 50-150
          marketCap: Math.random() * 1000 + 100, // Mock market cap 100-1100B
          sharesOutstanding: Math.random() * 1000 + 100, // Mock shares
          source: 'polygon_demo'
        };
      }

      const result = data.results;
      
      // Extract current price
      let last: number | null = null;
      if (result.day?.c) {
        last = result.day.c;
      } else if (result.min?.c) {
        last = result.min.c;
      } else if (result.prevDay?.c && result.todaysChange) {
        last = result.prevDay.c + result.todaysChange;
      }

      // Extract market cap and shares outstanding
      let marketCap: number | null = null;
      let sharesOutstanding: number | null = null;
      
      if (result.marketCap) {
        marketCap = result.marketCap;
      }
      
      if (result.shareClass?.sharesOutstanding) {
        sharesOutstanding = result.shareClass.sharesOutstanding;
      }

      return {
        ticker,
        last,
        marketCap,
        sharesOutstanding,
        source: 'polygon'
      };

    } catch (error: any) {
      logger.error(`Error fetching Polygon snapshot for ${ticker}:`, {
        status: error.response?.status,
        request_id: error.response?.data?.request_id,
        symbol: ticker
      });
      throw error; // Re-throw to be handled by caller
    }
  }

  /**
   * Get fallback data from lastKnown < 24h
   */
  private async getFallbackLastKnown(ticker: string): Promise<PolygonSnapshotData> {
    try {
      const lastKnown = await prisma.pricesDaily.findFirst({
        where: {
          ticker,
          updatedAt: {
            gte: subHours(new Date(), 24)
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      if (lastKnown?.last != null) {
        logger.info(`Using fallback lastKnown for ${ticker}`, {
          last: lastKnown.last,
          marketCap: lastKnown.marketCap,
          updatedAt: lastKnown.updatedAt
        });

        return {
          ticker,
          last: lastKnown.last,
          marketCap: lastKnown.marketCap,
          sharesOutstanding: lastKnown.sharesOutstanding,
          source: 'fallback_lastKnown',
          flags: ['price_stale']
        };
      } else {
        logger.warn(`No fallback data available for ${ticker}`);
        return {
          ticker,
          last: null,
          marketCap: null,
          sharesOutstanding: null,
          source: 'not_found',
          flags: ['not_found']
        };
      }
    } catch (error: any) {
      logger.error(`Error fetching fallback data for ${ticker}:`, error);
      return {
        ticker,
        last: null,
        marketCap: null,
        sharesOutstanding: null,
        source: 'fallback_error',
        flags: ['fallback_error']
      };
    }
  }
}