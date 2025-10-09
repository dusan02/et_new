import axios from 'axios';
import { logger } from '@/lib/logger';

export interface FinnhubEarningsData {
  ticker: string;
  epsEst: number | null;
  epsAct: number | null;
  revEst: number | null;
  revAct: number | null;
  hasSchedule: boolean;
  scheduleInferred: boolean;
  actualPending: boolean;
  source: 'finnhub';
}

export class FinnhubProvider {
  private apiKey: string;
  private baseUrl = 'https://finnhub.io/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get earnings data for multiple tickers for a specific date
   */
  async getEarningsTickers(tickers: string[], date: string): Promise<FinnhubEarningsData[]> {
    const results: FinnhubEarningsData[] = [];
    
    // Process in batches of 5 to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(ticker => this.getSingleTickerEarnings(ticker, date))
      );
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.warn(`Failed to fetch earnings for ${batch[index]}:`, result.reason);
          // Add failed ticker with null values
          results.push({
            ticker: batch[index],
            epsEst: null,
            epsAct: null,
            revEst: null,
            revAct: null,
            hasSchedule: false,
            scheduleInferred: false,
            actualPending: false,
            source: 'finnhub'
          });
        }
      });
      
      // Rate limiting - wait 200ms between batches
      if (i + batchSize < tickers.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return results;
  }

  /**
   * Get earnings data for a single ticker
   */
  private async getSingleTickerEarnings(ticker: string, date: string): Promise<FinnhubEarningsData> {
    try {
      // First, try to get earnings calendar data
      const calendarResponse = await axios.get(
        `${this.baseUrl}/calendar/earnings`,
        {
          params: {
            token: this.apiKey,
            from: date,
            to: date
          },
          timeout: 10000,
        }
      );

      const calendarData = calendarResponse.data;
      const earningsData = calendarData.earningsCalendar?.find((item: any) => 
        item.symbol === ticker
      );

      if (!earningsData) {
        logger.warn(`No earnings calendar data found for ${ticker} on ${date}`);
        return {
          ticker,
          epsEst: null,
          epsAct: null,
          revEst: null,
          revAct: null,
          hasSchedule: false,
          scheduleInferred: false,
          actualPending: false,
          source: 'finnhub'
        };
      }

      // Extract earnings data
      const epsEst = this.normalizeNumber(earningsData.epsEstimate);
      const epsAct = this.normalizeNumber(earningsData.epsActual);
      const revEst = this.normalizeNumber(earningsData.revenueEstimate);
      const revAct = this.normalizeNumber(earningsData.revenueActual);

      // Determine if actual is pending
      const actualPending = (epsEst !== null && epsAct === null) || 
                           (revEst !== null && revAct === null);

      return {
        ticker,
        epsEst,
        epsAct,
        revEst,
        revAct,
        hasSchedule: true,
        scheduleInferred: false,
        actualPending,
        source: 'finnhub'
      };

    } catch (error) {
      logger.error(`Error fetching earnings for ${ticker}:`, error);
      return {
        ticker,
        epsEst: null,
        epsAct: null,
        revEst: null,
        revAct: null,
        hasSchedule: false,
        scheduleInferred: false,
        actualPending: false,
        source: 'finnhub'
      };
    }
  }

  /**
   * Get earnings data for a specific ticker and date (alternative method)
   */
  async getTickerEarnings(ticker: string, date: string): Promise<FinnhubEarningsData> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/calendar/earnings`,
        {
          params: {
            token: this.apiKey,
            symbol: ticker,
            from: date,
            to: date
          },
          timeout: 10000,
        }
      );

      const data = response.data;
      const earningsData = data.earningsCalendar?.[0];

      if (!earningsData) {
        logger.warn(`No earnings data found for ${ticker} on ${date}`);
        return {
          ticker,
          epsEst: null,
          epsAct: null,
          revEst: null,
          revAct: null,
          hasSchedule: false,
          scheduleInferred: false,
          actualPending: false,
          source: 'finnhub'
        };
      }

      const epsEst = this.normalizeNumber(earningsData.epsEstimate);
      const epsAct = this.normalizeNumber(earningsData.epsActual);
      const revEst = this.normalizeNumber(earningsData.revenueEstimate);
      const revAct = this.normalizeNumber(earningsData.revenueActual);

      const actualPending = (epsEst !== null && epsAct === null) || 
                           (revEst !== null && revAct === null);

      return {
        ticker,
        epsEst,
        epsAct,
        revEst,
        revAct,
        hasSchedule: true,
        scheduleInferred: false,
        actualPending,
        source: 'finnhub'
      };

    } catch (error) {
      logger.error(`Error fetching earnings for ${ticker}:`, error);
      return {
        ticker,
        epsEst: null,
        epsAct: null,
        revEst: null,
        revAct: null,
        hasSchedule: false,
        scheduleInferred: false,
        actualPending: false,
        source: 'finnhub'
      };
    }
  }

  /**
   * Normalize number values (NaN -> null)
   */
  private normalizeNumber(value: any): number | null {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  }
}
