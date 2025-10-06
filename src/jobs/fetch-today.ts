import dotenv from 'dotenv'
dotenv.config()
import { prisma } from '@/lib/prisma'
import { isoDate, getTodayStart, getNYTimeString } from '@/modules/shared'
import { 
  EarningsService, 
  CreateEarningsInput,
  calculateSurprise 
} from '@/modules/earnings'
import { 
  MarketDataService,
  CreateMarketDataInput,
  calculateMarketCapDifference,
  validateMarketCapInputs 
} from '@/modules/market-data'
import { UnifiedDataFetcher } from '@/modules/data-integration/services/unified-fetcher.service'
import { setDailyResetState, isDailyResetCompleted } from '@/lib/daily-reset-state'
import axios from 'axios'

console.log('Environment variables:', {
  FINNHUB_API_KEY: process.env.FINNHUB_API_KEY,
  POLYGON_API_KEY: process.env.POLYGON_API_KEY,
  NODE_ENV: process.env.NODE_ENV
})

console.log('Current NY time:', getNYTimeString())

const FINN = process.env.FINNHUB_API_KEY!
const POLY = process.env.POLYGON_API_KEY!

/**
 * Retry function for API calls with exponential backoff
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelay - Base delay in milliseconds
 * @returns Promise with result or throws error
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>, 
  maxRetries: number = 3, 
  baseDelay: number = 1000,
  ticker?: string
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        // Final attempt failed
        if (ticker) {
          console.warn(`Final retry failed for ${ticker} after ${maxRetries + 1} attempts:`, lastError.message)
        }
        throw lastError
      }
      
      // Check if it's a rate limit error (429) or server error (5xx)
      const isRetryableError = 
        (error as any)?.response?.status === 429 || 
        (error as any)?.response?.status >= 500 ||
        (error as any)?.code === 'ECONNRESET' ||
        (error as any)?.code === 'ETIMEDOUT'
      
      if (!isRetryableError) {
        // Don't retry for client errors (4xx) except rate limits
        throw lastError
      }
      
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000 // Add jitter
      
      if (ticker) {
        console.warn(`Attempt ${attempt + 1}/${maxRetries + 1} failed for ${ticker}, retrying in ${delay.toFixed(0)}ms:`, lastError.message)
      }
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}

// Validation function moved to @/modules/market-data

async function fetchFinnhubEarnings(date: string) {
  const url = 'https://finnhub.io/api/v1/calendar/earnings'
  const { data } = await retryWithBackoff(
    () => axios.get(url, { 
      params: { from: date, to: date, token: FINN },
      timeout: 30000
    }),
    3, // maxRetries for earnings data
    2000, // baseDelay
    'Finnhub-Earnings'
  )
  
  if (!data || !data.earningsCalendar || !Array.isArray(data.earningsCalendar)) {
    console.warn('No earnings data received from Finnhub')
    return []
  }
  
  return data.earningsCalendar.map((earning: any) => ({
    ticker: earning.symbol,
    reportDate: new Date(earning.date),
    reportTime: earning.hour || 'AMC',
    epsActual: earning.epsActual || null,
    epsEstimate: earning.epsEstimate || null,
    revenueActual: earning.revenueActual ? BigInt(Math.round(earning.revenueActual)) : null,
    revenueEstimate: earning.revenueEstimate ? BigInt(Math.round(earning.revenueEstimate)) : null,
    sector: earning.sector || null,
    companyType: earning.companyType || null,
    dataSource: 'finnhub',
    sourcePriority: 1,
    fiscalPeriod: earning.fiscalPeriod || null,
    fiscalYear: earning.fiscalYear || null,
    primaryExchange: earning.primaryExchange || null
  }))
}

async function fetchPolygonMarketData(tickers: string[]) {
  const marketData: Record<string, any> = {}
  
  // Process tickers in batches to avoid overwhelming the API
  const BATCH_SIZE = 10 // Process 10 tickers at a time
  const batches = []
  
  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    batches.push(tickers.slice(i, i + BATCH_SIZE))
  }
  
  console.log(`📦 Processing ${tickers.length} tickers in ${batches.length} batches of ${BATCH_SIZE}`)
  
  // Process all batches in parallel for maximum performance
  const batchPromises = batches.map(async (batch, batchIndex) => {
    const tickerPromises = batch.map(async (ticker) => {
      try {
        // Get previous close price with retry
        const { data: prevData } = await retryWithBackoff(
          () => axios.get(
            `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev`,
            { params: { apikey: POLY }, timeout: 10000 }
          ),
          2, // maxRetries
          1000, // baseDelay
          ticker
        )
        
        // Get current price using snapshot (works with Starter plan)
        let currentPrice = null
        let todaysChangePerc = null
        try {
          const { data: snapshotData } = await retryWithBackoff(
            () => axios.get(
              `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`,
              { params: { apikey: POLY }, timeout: 10000 }
            ),
            2, // maxRetries
            1000, // baseDelay
            ticker
          )
          // Get current price - day.c can be 0 during pre-market, so calculate from prevDay + change
          const dayClose = snapshotData?.ticker?.day?.c
          const prevDayClose = snapshotData?.ticker?.prevDay?.c
          const todaysChange = snapshotData?.ticker?.todaysChange
          
          if (dayClose && dayClose > 0) {
            // Market is open and we have today's close
            currentPrice = dayClose
          } else if (prevDayClose && todaysChange !== null && todaysChange !== undefined) {
            // Pre-market: calculate current price from previous close + today's change
            currentPrice = prevDayClose + todaysChange
            console.log(`${ticker}: Using calculated current price: ${prevDayClose} + ${todaysChange} = ${currentPrice}`)
          } else {
            currentPrice = null
          }
          
          todaysChangePerc = snapshotData?.ticker?.todaysChangePerc || null
        } catch (error) {
          console.warn(`Failed to fetch snapshot for ${ticker}, using prev close:`, (error as Error).message)
        }
        
        // Get company name
        let companyName = null
        try {
          const { data: profileData } = await retryWithBackoff(
            () => axios.get(
              `https://api.polygon.io/v3/reference/tickers/${ticker}`,
              { params: { apikey: POLY }, timeout: 10000 }
            ),
            2, // maxRetries
            1000, // baseDelay
            ticker
          )
          companyName = profileData?.results?.name || null
        } catch (error) {
          console.warn(`Failed to fetch company name for ${ticker}:`, error)
        }
        
        const prevClose = prevData?.results?.[0]?.c || null
        const current = currentPrice // Don't fallback to prevClose
        
        if (!prevClose) {
          console.warn(`Failed to fetch previous close for ${ticker}: No data available`)
          return null
        }
        
        // Only calculate price change if we have current price, otherwise set to null
        let priceChangePercent: number | null = null
        if (current && prevClose) {
          if (todaysChangePerc !== null) {
            priceChangePercent = todaysChangePerc
          } else if (current !== prevClose) {
            priceChangePercent = ((current - prevClose) / prevClose) * 100
          }
          // If current === prevClose, keep priceChangePercent as null
        }
        
        // Check for extreme price changes (more than 50% in either direction)
        if (priceChangePercent !== null && Math.abs(priceChangePercent) > 50) {
          console.warn(`Extreme price change detected for ${ticker}: ${priceChangePercent.toFixed(2)}% (${prevClose} -> ${current}). Setting to null.`)
          priceChangePercent = null
        }
        
        // Get shares outstanding from company details
        let sharesOutstanding = null
        
        try {
          const { data: profileData } = await retryWithBackoff(
            () => axios.get(
              `https://api.polygon.io/v3/reference/tickers/${ticker}`,
              { params: { apikey: POLY }, timeout: 10000 }
            ),
            2, // maxRetries
            1000, // baseDelay
            ticker
          )
          sharesOutstanding = profileData?.results?.share_class_shares_outstanding || null
        } catch (error) {
          console.warn(`Failed to fetch shares outstanding for ${ticker}:`, error)
          // Fallback: get shares from previous day data if available
          if (prevData?.results?.[0]?.n) {
            sharesOutstanding = prevData.results[0].n
          }
        }
        
        // Calculate current market cap using current price and shares outstanding
        let marketCap = null
        if (current && sharesOutstanding) {
          marketCap = current * sharesOutstanding
        } else if (prevClose && sharesOutstanding) {
          // Fallback to previous close for market cap calculation
          marketCap = prevClose * sharesOutstanding
        }
        
        // Calculate market cap difference (current vs previous day) with validation
        let marketCapDiff = null
        let marketCapDiffBillions = null
        
        // Use market data module for calculation
        // If current price is null, treat it as no change (use prevClose for calculation)
        const priceForCalculation = current || prevClose
        const calculationResult = calculateMarketCapDifference({
          currentPrice: priceForCalculation,
          previousClose: prevClose,
          sharesOutstanding: sharesOutstanding ? BigInt(sharesOutstanding) : null,
          ticker
        })
        
        if (calculationResult.isValid) {
          // If we used prevClose as current price, the difference should be 0
          if (!current && priceForCalculation === prevClose) {
            marketCapDiff = 0
            marketCapDiffBillions = 0
          } else {
            marketCapDiff = calculationResult.marketCapDiff
            marketCapDiffBillions = calculationResult.marketCapDiffBillions
          }
        } else {
          console.warn(`❌ Pre-market data update error: ${calculationResult.validationErrors.join(', ')}`)
        }
        
        // Determine company size
        let size = null
        if (marketCap && marketCap > 0) {
          if (marketCap > 100e9) size = 'Mega'       // > $100B
          else if (marketCap >= 10e9) size = 'Large' // $10B - $100B
          else if (marketCap >= 2e9) size = 'Mid'    // $2B - $10B
          else size = 'Small'                        // < $2B
        }
        
        return {
          ticker,
          currentPrice: current || prevClose, // Return prevClose if no current price for display purposes
          previousClose: prevClose,
          priceChangePercent,
          companyName: companyName || ticker, // Fallback to ticker if company name is null
          size,
          marketCap,
          marketCapDiff,
          marketCapDiffBillions,
          sharesOutstanding,
          companyType: 'Public',
          primaryExchange: 'NYSE' // Default, could be enhanced
        }
        
      } catch (error) {
        console.warn(`Failed to fetch market data for ${ticker}:`, error)
        return null
      }
    })
    
    const tickerResults = await Promise.all(tickerPromises)
    
    // Filter out null results and add to marketData
    const batchResults: any[] = []
    tickerResults.forEach((result, index) => {
      if (result) {
        marketData[batch[index]] = result
        batchResults.push(result)
      }
    })
    
    // Log progress
    const successfulCount = batchResults.length
    const failedCount = tickerResults.length - successfulCount
    console.log(`📊 Batch ${batchIndex + 1}/${batches.length} completed: ${successfulCount} successful, ${failedCount} failed`)
    
    return batchResults
  })
  
  // Wait for all batches to complete in parallel
  const allBatchResults = await Promise.all(batchPromises)
  const totalSuccessful = allBatchResults.flat().length
  
  console.log(`🎉 All batches completed! Total successful: ${totalSuccessful}/${tickers.length}`)
  
  return marketData
}

async function upsertEarningsData(earningsData: any[]) {
  let upsertCount = 0
  
  for (const earning of earningsData) {
    try {
      await prisma.earningsTickersToday.upsert({
        where: {
          reportDate_ticker: {
            reportDate: earning.reportDate,
            ticker: earning.ticker,
          },
        },
        update: {
          reportTime: earning.reportTime,
          epsActual: earning.epsActual,
          epsEstimate: earning.epsEstimate,
          revenueActual: earning.revenueActual,
          revenueEstimate: earning.revenueEstimate,
          sector: earning.sector,
          companyType: earning.companyType,
          dataSource: earning.dataSource,
          sourcePriority: earning.sourcePriority,
          fiscalPeriod: earning.fiscalPeriod,
          fiscalYear: earning.fiscalYear,
          primaryExchange: earning.primaryExchange,
          updatedAt: new Date(),
        },
        create: earning,
      })
      upsertCount++
    } catch (error) {
      console.error(`Error upserting earnings data for ${earning.ticker}:`, error)
    }
  }
  
  return upsertCount
}

async function upsertMarketData(marketData: Record<string, any>, reportDate: Date) {
  let upsertCount = 0
  
  for (const [ticker, data] of Object.entries(marketData)) {
    try {
      // Explicit guard pre priceChangePercent - zachová 0, pošle null pre null/undefined
      const priceChangePercent = 
        data.priceChangePercent === null || data.priceChangePercent === undefined
          ? null
          : data.priceChangePercent;

      console.log('[UPSERT] %s | current=%s prev=%s todaysChangePerc=%s -> priceChangePercent=%s',
        data.ticker, data.currentPrice, data.previousClose, data.todaysChangePerc, priceChangePercent);

      await prisma.todayEarningsMovements.upsert({
        where: {
          ticker_reportDate: {
            ticker,
            reportDate,
          },
        },
        update: {
          currentPrice: data.currentPrice,
          previousClose: data.previousClose,
          priceChangePercent: priceChangePercent,
          companyName: data.companyName,
          size: data.size,
          marketCap: data.marketCap ? BigInt(Math.round(data.marketCap)) : null,
          marketCapDiff: data.marketCapDiff,
          marketCapDiffBillions: data.marketCapDiffBillions,
          sharesOutstanding: data.sharesOutstanding,
          companyType: data.companyType,
          primaryExchange: data.primaryExchange,
          updatedAt: new Date(),
        },
        create: {
          ticker,
          reportDate,
          currentPrice: data.currentPrice,
          previousClose: data.previousClose,
          priceChangePercent: priceChangePercent,
          companyName: data.companyName,
          size: data.size,
          marketCap: data.marketCap ? BigInt(Math.round(data.marketCap)) : null,
          marketCapDiff: data.marketCapDiff,
          marketCapDiffBillions: data.marketCapDiffBillions,
          sharesOutstanding: data.sharesOutstanding,
          companyType: data.companyType,
          primaryExchange: data.primaryExchange,
        },
      })
      upsertCount++
    } catch (error) {
      console.error(`Error upserting market data for ${ticker}:`, error)
    }
  }
  
  return upsertCount
}

async function main() {
  try {
    const date = process.env.DATE || isoDate()
    console.log(`Starting unified data fetch for ${date} (NY time: ${getNYTimeString()})`)
    
    // Check if daily reset is completed (unless skipped for main fetch)
    const skipResetCheck = process.env.SKIP_RESET_CHECK === 'true'
    if (!skipResetCheck) {
      const resetCompleted = await isDailyResetCompleted()
      if (!resetCompleted) {
        console.log('⚠️ Daily reset not completed - skipping fetch to avoid race conditions')
        return {
          date,
          earningsCount: 0,
          marketCount: 0,
          totalTickers: 0,
          skipped: true,
          reason: 'Daily reset not completed'
        }
      }
    }
    
    // Použi nový UnifiedDataFetcher
    let result
    try {
      const fetcher = new UnifiedDataFetcher()
      result = await fetcher.fetchAllData({
        date,
        maxRetries: 3,
        batchSize: 10,
        delayBetweenBatches: 1000
      })
    } catch (error) {
      console.error('Error creating or calling UnifiedDataFetcher:', error)
      throw new Error(`UnifiedDataFetcher error: ${error}`)
    }
    
    if (!result || !result.success) {
      const errors = result?.errors || ['Unknown error occurred']
      console.error('❌ Unified fetch failed:', errors)
      throw new Error(`Fetch failed: ${errors.join(', ')}`)
    }
    
    // Check for partial failures in market data
    if (result.errors && result.errors.length > 0) {
      console.warn(`⚠️ Fetch completed with ${result.errors.length} warnings:`, result.errors.slice(0, 5))
    }
    
    console.log(`✅ Unified data fetch completed successfully! Earnings: ${result.earningsCount}, Market: ${result.marketCount}, Tickers: ${result.totalTickers}`)
    
    // Set daily fetch state
    await setDailyResetState('FETCH_DONE')
    
    return {
      date,
      earningsCount: result.earningsCount,
      marketCount: result.marketCount,
      totalTickers: result.totalTickers,
      errors: result.errors || []
    }
  } catch (error) {
    console.error('Error in main fetch process:', error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then((result) => {
      if (result.skipped) {
        console.log(`⏭️ Fetch skipped: ${result.reason}`)
        process.exitCode = 0 // Success but skipped
      } else if (result.errors && result.errors.length > 0) {
        console.log(`⚠️ Fetch completed with warnings: ${result.errors.length} errors`)
        console.log(`📊 Results: Earnings=${result.earningsCount}, Market=${result.marketCount}, Tickers=${result.totalTickers}`)
        process.exitCode = 1 // Partial failure
      } else {
        console.log(`✅ Fetch completed successfully!`)
        console.log(`📊 Results: Earnings=${result.earningsCount}, Market=${result.marketCount}, Tickers=${result.totalTickers}`)
        process.exitCode = 0 // Full success
      }
    })
    .catch((error) => {
      console.error('❌ Fatal error in fetch process:', error)
      process.exitCode = 1 // Fatal failure
    })
    .finally(() => {
      prisma.$disconnect()
    })
}

export { main }