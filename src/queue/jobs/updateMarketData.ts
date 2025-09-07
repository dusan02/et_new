import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { logger } from '../../server/utils/logger';

const prisma = new PrismaClient();

interface PolygonQuoteResponse {
  ticker: string;
  last_quote: {
    p: number; // price
    s: number; // size
    P: number; // bid price
    S: number; // bid size
    f: number; // ask price
    F: number; // ask size
    t: number; // timestamp
  };
}

interface PolygonPrevCloseResponse {
  ticker: string;
  results: {
    c: number; // close price
    h: number; // high
    l: number; // low
    o: number; // open
    v: number; // volume
    vw: number; // volume weighted average
    t: number; // timestamp
  }[];
}

export async function updateMarketData() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all tickers that have earnings today
    const earningsTickers = await prisma.earningsTickersToday.findMany({
      where: {
        reportDate: today,
      },
      select: {
        ticker: true,
      },
    });

    const tickers = earningsTickers.map(e => e.ticker);
    logger.info(`Updating market data for ${tickers.length} tickers`);

    if (tickers.length === 0) {
      return { count: 0, message: 'No tickers to update' };
    }

    // Process tickers in batches - UNLIMITED API calls!
    const batchSize = 50; // Increased batch size for unlimited API
    let updateCount = 0;

    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize);
      
      const promises = batch.map(async (ticker) => {
        try {
          await updateTickerMarketData(ticker);
          updateCount++;
        } catch (error) {
          logger.error(`Failed to update market data for ${ticker}:`, error);
        }
      });

      await Promise.allSettled(promises);
      
      // Minimal delay for unlimited API - only 50ms
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    logger.info(`Successfully updated market data for ${updateCount} tickers`);
    return { count: updateCount };
  } catch (error) {
    logger.error('Error updating market data:', error);
    throw error;
  }
}

async function updateTickerMarketData(ticker: string) {
  try {
    // Fetch current quote
    const [quoteResponse, prevCloseResponse] = await Promise.allSettled([
      axios.get<PolygonQuoteResponse>(
        `https://api.polygon.io/v2/last/nbbo/${ticker}`,
        {
          params: {
            apikey: process.env.POLYGON_API_KEY || 'Vi_pMLcusE8RA_SUvkPAmiyziVzlmOoX',
          },
          timeout: 10000,
        }
      ),
      axios.get<PolygonPrevCloseResponse>(
        `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev`,
        {
          params: {
            apikey: process.env.POLYGON_API_KEY || 'Vi_pMLcusE8RA_SUvkPAmiyziVzlmOoX',
            adjusted: true,
          },
          timeout: 10000,
        }
      ),
    ]);

    let currentPrice = 0;
    let previousClose = 0;
    let marketCap = 0;
    let sharesOutstanding = 0;

    // Process quote data
    if (quoteResponse.status === 'fulfilled' && quoteResponse.value.data.last_quote) {
      currentPrice = quoteResponse.value.data.last_quote.p;
    }

    // Process previous close data
    if (prevCloseResponse.status === 'fulfilled' && prevCloseResponse.value.data.results.length > 0) {
      const prevData = prevCloseResponse.value.data.results[0];
      previousClose = prevData.c;
    }

    // Get shares outstanding from database or fetch from API
    const sharesData = await prisma.sharesOutstanding.findUnique({
      where: { ticker },
    });

    if (sharesData) {
      sharesOutstanding = Number(sharesData.sharesOutstanding);
    } else {
      // Fetch shares outstanding from Polygon
      try {
        const sharesResponse = await axios.get(
          `https://api.polygon.io/v3/reference/tickers/${ticker}`,
          {
            params: {
              apikey: process.env.POLYGON_API_KEY || 'Vi_pMLcusE8RA_SUvkPAmiyziVzlmOoX',
            },
            timeout: 10000,
          }
        );

        const tickerData = sharesResponse.data.results;
        if (tickerData && tickerData.share_class_shares_outstanding) {
          sharesOutstanding = tickerData.share_class_shares_outstanding;
          
          // Save to database
          await prisma.sharesOutstanding.upsert({
            where: { ticker },
            update: { sharesOutstanding: BigInt(sharesOutstanding) },
            create: { ticker, sharesOutstanding: BigInt(sharesOutstanding) },
          });
        }
      } catch (error) {
        logger.warn(`Failed to fetch shares outstanding for ${ticker}:`, error);
      }
    }

    // Calculate market cap
    if (currentPrice > 0 && sharesOutstanding > 0) {
      marketCap = currentPrice * sharesOutstanding;
    }

    // Calculate price change
    const priceChangePercent = previousClose > 0 
      ? ((currentPrice - previousClose) / previousClose) * 100 
      : 0;

    // Determine size category
    let size = 'Small';
    if (marketCap >= 10000000000) { // $10B+
      size = 'Large';
    } else if (marketCap >= 2000000000) { // $2B+
      size = 'Mid';
    }

    // Calculate market cap difference
    const marketCapDiff = marketCap - (previousClose * sharesOutstanding);
    const marketCapDiffBillions = marketCapDiff / 1000000000;

    // Get company name (you might want to fetch this from an API)
    const companyName = ticker; // Placeholder - should fetch from API

    // Upsert market data
    await prisma.todayEarningsMovements.upsert({
      where: { ticker },
      update: {
        companyName,
        currentPrice,
        previousClose,
        marketCap: BigInt(Math.floor(marketCap)),
        size,
        marketCapDiff: BigInt(Math.floor(marketCapDiff)),
        marketCapDiffBillions,
        priceChangePercent,
        sharesOutstanding: BigInt(sharesOutstanding),
        updatedAt: new Date(),
      },
      create: {
        ticker,
        companyName,
        currentPrice,
        previousClose,
        marketCap: BigInt(Math.floor(marketCap)),
        size,
        marketCapDiff: BigInt(Math.floor(marketCapDiff)),
        marketCapDiffBillions,
        priceChangePercent,
        sharesOutstanding: BigInt(sharesOutstanding),
      },
    });

    logger.debug(`Updated market data for ${ticker}: $${currentPrice} (${priceChangePercent.toFixed(2)}%)`);
  } catch (error) {
    logger.error(`Error updating market data for ${ticker}:`, error);
    throw error;
  }
}
