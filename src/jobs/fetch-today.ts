import dotenv from 'dotenv'
dotenv.config()
import { prisma } from '@/lib/prisma'
import { isoDate, getNYDate, getNYTimeString } from '@/lib/dates'
import axios from 'axios'

console.log('Environment variables:', {
  FINNHUB_API_KEY: process.env.FINNHUB_API_KEY,
  POLYGON_API_KEY: process.env.POLYGON_API_KEY,
  NODE_ENV: process.env.NODE_ENV
})

console.log('Current NY time:', getNYTimeString())

const FINN = process.env.FINNHUB_API_KEY!
const POLY = process.env.POLYGON_API_KEY!

async function fetchFinnhubEarnings(date: string) {
  const url = 'https://finnhub.io/api/v1/calendar/earnings'
  const { data } = await axios.get(url, { 
    params: { from: date, to: date, token: FINN },
    timeout: 30000
  })
  
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
  
  for (const batch of batches) {
    const batchPromises = batch.map(async (ticker) => {
      try {
        // Get previous close price
        const { data: prevData } = await axios.get(
          `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev`,
          { params: { apikey: POLY }, timeout: 10000 }
        )
        
        // Get last trade price
        let currentPrice = null
        try {
          const { data: lastTradeData } = await axios.get(
            `https://api.polygon.io/v2/last/trade/${ticker}`,
            { params: { apikey: POLY }, timeout: 10000 }
          )
          currentPrice = lastTradeData?.results?.p || null
        } catch (error) {
          console.warn(`Failed to fetch last trade for ${ticker}, using prev close:`, (error as Error).message)
        }
        
        // Get company name
        let companyName = null
        try {
          const { data: profileData } = await axios.get(
            `https://api.polygon.io/v3/reference/tickers/${ticker}`,
            { params: { apikey: POLY }, timeout: 10000 }
          )
          companyName = profileData?.results?.name || null
        } catch (error) {
          console.warn(`Failed to fetch company name for ${ticker}:`, error)
        }
        
        const prevClose = prevData?.results?.[0]?.c || null
        const current = currentPrice || prevClose
        
        if (!prevClose || !current) {
          console.warn(`Failed to fetch ticker details for ${ticker}: No data available`)
          return null
        }
        
        // Calculate price change percentage
        const priceChangePercent = ((current - prevClose) / prevClose) * 100
        
        // Check for extreme price changes (more than 50% in either direction)
        if (Math.abs(priceChangePercent) > 50) {
          console.warn(`Extreme price change detected for ${ticker}: ${priceChangePercent.toFixed(2)}% (${prevClose} -> ${current}). Setting to null.`)
          return null
        }
        
        // Get shares outstanding from company details
        let sharesOutstanding = null
        
        try {
          const { data: profileData } = await axios.get(
            `https://api.polygon.io/v3/reference/tickers/${ticker}`,
            { params: { apikey: POLY }, timeout: 10000 }
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
        }
        
        // Calculate market cap difference (current vs previous day)
        let marketCapDiff = null
        let marketCapDiffBillions = null
        if (marketCap && sharesOutstanding && prevClose) {
          const prevMarketCap = prevClose * sharesOutstanding
          marketCapDiff = ((marketCap - prevMarketCap) / prevMarketCap) * 100
          
          // Check for extreme market cap changes
          if (Math.abs(marketCapDiff) > 100) {
            console.warn(`Extreme market cap change detected for ${ticker}: ${marketCapDiff.toFixed(2)}%. Setting to null.`)
            marketCapDiff = null
          } else {
            marketCapDiffBillions = (marketCap - prevMarketCap) / 1e9
          }
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
          currentPrice: current,
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
    
    const results = await Promise.all(batchPromises)
    
    // Filter out null results and add to marketData
    results.forEach((result, index) => {
      if (result) {
        marketData[batch[index]] = result
      }
    })
    
    // Log progress
    const successfulCount = results.filter(r => r !== null).length
    const failedCount = results.length - successfulCount
    console.log(`📊 Batch ${batches.indexOf(batch) + 1}/${batches.length} completed: ${successfulCount} successful, ${failedCount} failed`)
    
    // Small delay between batches
    if (batches.indexOf(batch) < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
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
          priceChangePercent: data.priceChangePercent,
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
          priceChangePercent: data.priceChangePercent,
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
    console.log(`Starting data fetch for ${date} (NY time: ${getNYTimeString()})`)
    
    // Fetch earnings data from Finnhub
    console.log('Fetching earnings data from Finnhub...')
    const earningsData = await fetchFinnhubEarnings(date)
    console.log(`Found ${earningsData.length} earnings records`)
    
    // Upsert earnings data
    const earningsCount = await upsertEarningsData(earningsData)
    console.log(`Upserted ${earningsCount} earnings records`)
    
    // Get unique tickers for market data
    const tickers = Array.from(new Set(earningsData.map((e: any) => e.ticker).filter(Boolean))) as string[]
    
    if (tickers.length > 0) {
      console.log(`Fetching market data for ${tickers.length} tickers...`)
      const marketData = await fetchPolygonMarketData(tickers)
      console.log(`Found market data for ${Object.keys(marketData).length} tickers`)
      
      // Upsert market data
      const marketCount = await upsertMarketData(marketData, new Date(date))
      console.log(`Upserted ${marketCount} market records`)
    }
    
    // 🚫 GUIDANCE DISABLED FOR PRODUCTION - Fetch guidance data commented out
    // if (tickers.length > 0) {
    //   console.log(`Fetching guidance data for ${tickers.length} tickers...`)
    //   const guidanceData = await fetchBenzingaGuidance(tickers)
    //   console.log(`Found ${guidanceData.length} guidance records`)
    //   
    //   // Upsert guidance data
    //   const guidanceCount = await upsertGuidanceData(guidanceData)
    //   console.log(`Upserted ${guidanceCount} guidance records`)
    // }
    
    console.log('Data fetch completed successfully!')
    
    return {
      date,
      earningsCount,
      marketCount: tickers.length > 0 ? await upsertMarketData(await fetchPolygonMarketData(tickers), new Date(date)) : 0,
      totalTickers: tickers.length,
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
      console.log('Final result:', result)
      process.exit(0)
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
    .finally(() => {
      prisma.$disconnect()
    })
}

export { main }