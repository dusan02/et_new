import dotenv from 'dotenv'
dotenv.config()
import { prisma } from '@/lib/prisma'
import { isoDate } from '@/lib/dates'
import axios from 'axios'

console.log('Environment variables:', {
  FINNHUB_API_KEY: process.env.FINNHUB_API_KEY,
  POLYGON_API_KEY: process.env.POLYGON_API_KEY,
  NODE_ENV: process.env.NODE_ENV
})

const FINN = process.env.FINNHUB_API_KEY!
const POLY = process.env.POLYGON_API_KEY!
const BENZINGA = process.env.POLYGON_API_KEY // Same as Polygon API key

async function fetchFinnhubEarnings(date: string) {
  const url = 'https://finnhub.io/api/v1/calendar/earnings'
  const { data } = await axios.get(url, { 
    params: { from: date, to: date, token: FINN },
    timeout: 30000
  })
  
  // Handle different response formats
  const earningsList = data?.earningsCalendar || data || []
  
  const processedEarnings = earningsList.map((r: any) => ({
    reportDate: new Date(r.date),
    ticker: r.symbol,
    reportTime: (r.hour || '').toUpperCase() === 'BMO' ? 'BMO' :
                (r.hour || '').toUpperCase() === 'AMC' ? 'AMC' : 'TNS',
    epsActual: r.epsActual ? parseFloat(r.epsActual.toString()) : null,
    epsEstimate: r.epsEstimate ? parseFloat(r.epsEstimate.toString()) : null,
    revenueActual: r.revenueActual ? BigInt(r.revenueActual) : null,
    revenueEstimate: r.revenueEstimate ? BigInt(r.revenueEstimate) : null,
    sector: r.sector || null,
    companyType: r.companyType || null,
    dataSource: 'finnhub',
    sourcePriority: 1,
    fiscalPeriod: r.quarter ? `Q${r.quarter}` : null,
    fiscalYear: r.year || null,
    primaryExchange: r.exchange || null,
  }))
  
  return processedEarnings
}

async function fetchPolygonMarketData(tickers: string[]) {
  const marketData: Record<string, any> = {}
  
  for (const ticker of tickers) {
    try {
      // Fetch previous close
      const { data: prevData } = await axios.get(
        `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev`,
        {
          params: { apiKey: POLY },
          timeout: 10000
        }
      )

      // Fetch current price from last trade (paid tier)
      let currentPrice = null
      let prevClose = prevData?.results?.[0]?.c
      
      try {
        const { data: lastTradeData } = await axios.get(
          `https://api.polygon.io/v2/last/trade/${ticker}`,
          {
            params: { apiKey: POLY },
            timeout: 5000
          }
        )
        currentPrice = lastTradeData?.results?.p
      } catch (error) {
        console.warn(`Failed to fetch last trade for ${ticker}, using prev close:`, (error as Error).message)
        currentPrice = prevClose // Fallback to previous close
      }
      
      // Fetch company name from Finnhub
      let companyName = ticker // Default fallback
      try {
        const { data: profileData } = await axios.get(
          `https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${FINN}`,
          { timeout: 5000 }
        )
        if (profileData?.name) {
          companyName = profileData.name
        }
      } catch (error) {
        console.warn(`Failed to fetch company name for ${ticker}:`, error)
      }
      
      // Fetch market cap and shares outstanding from Polygon
      let marketCap = null
      let sharesOutstanding = null
      let size = 'Large' // Default
      try {
        const { data: tickerData } = await axios.get(
          `https://api.polygon.io/v3/reference/tickers/${ticker}`,
          { 
            params: { apiKey: POLY },
            timeout: 5000
          }
        )
        
        if (tickerData?.results) {
          // Get shares outstanding from Polygon
          sharesOutstanding = tickerData.results.share_class_shares_outstanding ? BigInt(tickerData.results.share_class_shares_outstanding) : null
        }
      } catch (error) {
        console.warn(`Failed to fetch ticker details for ${ticker}:`, error)
      }
      
      if (prevClose && currentPrice) {
        // Calculate actual price change percentage with sanity check
        let priceChangePercent = ((currentPrice - prevClose) / prevClose) * 100
        
        // Clamp extreme percentage changes (e.g., +9900% from 0.0001 to 0.01)
        if (Math.abs(priceChangePercent) > 1000) {
          console.warn(`Extreme price change detected for ${ticker}: ${priceChangePercent.toFixed(2)}% (${prevClose} -> ${currentPrice}). Setting to null.`)
          priceChangePercent = null as any
        }
        
        // Calculate current market cap: currentPrice × sharesOutstanding
        let currentMarketCap = null
        let previousMarketCap = null
        let marketCapDiff = null
        let marketCapDiffBillions = null
        
        if (sharesOutstanding) {
          currentMarketCap = BigInt(Math.round(currentPrice * Number(sharesOutstanding)))
          previousMarketCap = BigInt(Math.round(prevClose * Number(sharesOutstanding)))
          
          // Calculate market cap difference
          const currentCapFloat = Number(currentMarketCap)
          const previousCapFloat = Number(previousMarketCap)
          marketCapDiff = ((currentCapFloat - previousCapFloat) / previousCapFloat) * 100
          marketCapDiffBillions = (currentCapFloat - previousCapFloat) / 1_000_000_000
          
          // Clamp extreme market cap changes (same logic as price change)
          if (Math.abs(marketCapDiff) > 1000) {
            console.warn(`Extreme market cap change detected for ${ticker}: ${marketCapDiff.toFixed(2)}%. Setting to null.`)
            marketCapDiff = null
            marketCapDiffBillions = null
          }
        }
        
        // Determine size based on current market cap
        let size = null // Default - no size if no market cap
        if (currentMarketCap) {
          const marketCapFloat = Number(currentMarketCap)
          if (marketCapFloat >= 10_000_000_000) { // 10B+
            size = 'Large'
          } else if (marketCapFloat >= 2_000_000_000) { // 2B-10B
            size = 'Mid'
          } else {
            size = 'Small'
          }
        }
        
        marketData[ticker] = {
          currentPrice,
          previousClose: prevClose,
          priceChangePercent,
          companyName, // Now using real company name from Finnhub
          size, // Determined by current market cap
          marketCap: currentMarketCap, // Current market cap: currentPrice × sharesOutstanding
          marketCapDiff, // Market cap change percentage
          marketCapDiffBillions, // Market cap change in billions
          sharesOutstanding, // From Polygon ticker details
          companyType: null,
          primaryExchange: null,
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch market data for ${ticker}:`, error)
    }
  }
  
  return marketData
}

async function fetchBenzingaGuidance(tickers: string[]) {
  if (!BENZINGA) {
    console.log('Benzinga API key not provided, skipping guidance data')
    return []
  }
  
  const guidanceData: any[] = []
  
  for (const ticker of tickers) {
    try {
      console.log(`Fetching guidance data for ${ticker}...`)
      
      // Fetch guidance data from Benzinga via Polygon API
      const { data } = await axios.get(
        `https://api.polygon.io/benzinga/v1/guidance`,
        {
          params: {
            ticker: ticker,
            limit: 10, // Get latest 10 guidance records
            sort: 'date.desc', // Most recent first
            apikey: BENZINGA
          },
          timeout: 10000
        }
      )
      
      if (data?.results && data.results.length > 0) {
        console.log(`Found ${data.results.length} guidance records for ${ticker}`)
        
        // Process each guidance record
        for (const record of data.results) {
          const guidance = {
            ticker: record.ticker,
            estimatedEpsGuidance: record.estimated_eps_guidance || null,
            estimatedRevenueGuidance: record.estimated_revenue_guidance ? BigInt(Math.round(record.estimated_revenue_guidance)) : null,
            epsGuideVsConsensusPct: null, // Not available in API
            revenueGuideVsConsensusPct: null, // Not available in API
            previousMinEpsGuidance: record.previous_min_eps_guidance || null,
            previousMaxEpsGuidance: record.previous_max_eps_guidance || null,
            previousMinRevenueGuidance: record.previous_min_revenue_guidance ? BigInt(Math.round(record.previous_min_revenue_guidance)) : null,
            previousMaxRevenueGuidance: record.previous_max_revenue_guidance ? BigInt(Math.round(record.previous_max_revenue_guidance)) : null,
            fiscalPeriod: record.fiscal_period || null,
            fiscalYear: record.fiscal_year || null,
            releaseType: record.release_type || null,
            lastUpdated: record.last_updated ? new Date(record.last_updated) : new Date()
          }
          
          guidanceData.push(guidance)
        }
      } else {
        console.log(`No guidance data found for ${ticker}`)
      }
      
    } catch (error: any) {
      console.warn(`Failed to fetch Benzinga guidance for ${ticker}:`, (error as Error).message)
    }
  }
  
  return guidanceData
}

function parseGuidanceFromArticle(article: any, ticker: string) {
  try {
    const content = article.content || article.summary || ''
    
    // Look for guidance patterns in the content
    const epsPattern = /(?:EPS|earnings per share).*?(?:guidance|forecast|outlook).*?(\d+\.?\d*)/i
    const revenuePattern = /(?:revenue|sales).*?(?:guidance|forecast|outlook).*?(\d+(?:\.\d+)?[BMK]?)/i
    
    const epsMatch = content.match(epsPattern)
    const revenueMatch = content.match(revenuePattern)
    
    if (epsMatch || revenueMatch) {
      return {
        ticker,
        estimatedEpsGuidance: epsMatch ? parseFloat(epsMatch[1]) : null,
        estimatedRevenueGuidance: revenueMatch ? parseRevenueString(revenueMatch[1]) : null,
        epsGuideVsConsensusPct: null, // Will be calculated later
        revenueGuideVsConsensusPct: null, // Will be calculated later
        previousMinEpsGuidance: null,
        previousMaxEpsGuidance: null,
        previousMinRevenueGuidance: null,
        previousMaxRevenueGuidance: null,
        fiscalPeriod: null,
        fiscalYear: null,
        releaseType: 'news',
        lastUpdated: new Date()
      }
    }
    
    return null
  } catch (error) {
    console.warn(`Failed to parse guidance from article for ${ticker}:`, error)
    return null
  }
}

function parseRevenueString(revenueStr: string): bigint | null {
  try {
    const num = parseFloat(revenueStr.replace(/[BMK]/gi, ''))
    const suffix = revenueStr.slice(-1).toUpperCase()
    
    switch (suffix) {
      case 'B': return BigInt(Math.round(num * 1e9))
      case 'M': return BigInt(Math.round(num * 1e6))
      case 'K': return BigInt(Math.round(num * 1e3))
      default: return BigInt(Math.round(num))
    }
  } catch {
    return null
  }
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
          marketCap: data.marketCap,
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
          marketCap: data.marketCap,
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

async function upsertGuidanceData(guidanceData: any[]) {
  let upsertCount = 0
  
  for (const guidance of guidanceData) {
    try {
      await prisma.benzingaGuidance.upsert({
        where: {
          ticker_fiscalPeriod_fiscalYear: {
            ticker: guidance.ticker,
            fiscalPeriod: guidance.fiscalPeriod || 'Q1',
            fiscalYear: guidance.fiscalYear || new Date().getFullYear()
          }
        },
        update: {
          estimatedEpsGuidance: guidance.estimatedEpsGuidance,
          estimatedRevenueGuidance: guidance.estimatedRevenueGuidance,
          epsGuideVsConsensusPct: guidance.epsGuideVsConsensusPct,
          revenueGuideVsConsensusPct: guidance.revenueGuideVsConsensusPct,
          previousMinEpsGuidance: guidance.previousMinEpsGuidance,
          previousMaxEpsGuidance: guidance.previousMaxEpsGuidance,
          previousMinRevenueGuidance: guidance.previousMinRevenueGuidance,
          previousMaxRevenueGuidance: guidance.previousMaxRevenueGuidance,
          releaseType: guidance.releaseType,
          lastUpdated: guidance.lastUpdated
        },
        create: {
          ticker: guidance.ticker,
          estimatedEpsGuidance: guidance.estimatedEpsGuidance,
          estimatedRevenueGuidance: guidance.estimatedRevenueGuidance,
          epsGuideVsConsensusPct: guidance.epsGuideVsConsensusPct,
          revenueGuideVsConsensusPct: guidance.revenueGuideVsConsensusPct,
          previousMinEpsGuidance: guidance.previousMinEpsGuidance,
          previousMaxEpsGuidance: guidance.previousMaxEpsGuidance,
          previousMinRevenueGuidance: guidance.previousMinRevenueGuidance,
          previousMaxRevenueGuidance: guidance.previousMaxRevenueGuidance,
          fiscalPeriod: guidance.fiscalPeriod || 'Q1',
          fiscalYear: guidance.fiscalYear || new Date().getFullYear(),
          releaseType: guidance.releaseType,
          lastUpdated: guidance.lastUpdated
        }
      })
      upsertCount++
    } catch (error) {
      console.warn(`Failed to upsert guidance for ${guidance.ticker}:`, error)
    }
  }
  
  return upsertCount
}

async function main() {
  try {
    const date = process.env.DATE || isoDate()
    console.log(`Starting data fetch for ${date}`)
    
    // Fetch earnings data from Finnhub
    console.log('Fetching earnings data from Finnhub...')
    const earningsData = await fetchFinnhubEarnings(date)
    console.log(`Found ${earningsData.length} earnings records`)
    
    // Upsert earnings data
    const earningsCount = await upsertEarningsData(earningsData)
    console.log(`Upserted ${earningsCount} earnings records`)
    
    // Get unique tickers for market data
    const tickers = Array.from(new Set(earningsData.map((e: any) => e.ticker).filter(Boolean))) as string[]
    console.log(`Fetching market data for ${tickers.length} tickers...`)
    
    // Fetch market data from Polygon
    const marketData = await fetchPolygonMarketData(tickers)
    console.log(`Fetched market data for ${Object.keys(marketData).length} tickers`)
    
    // Upsert market data
    const marketCount = await upsertMarketData(marketData, new Date(date))
    console.log(`Upserted ${marketCount} market data records`)
    
    // Fetch guidance data from Benzinga
    if (tickers.length > 0) {
      console.log(`Fetching guidance data for ${tickers.length} tickers...`)
      const guidanceData = await fetchBenzingaGuidance(tickers)
      console.log(`Found ${guidanceData.length} guidance records`)
      
      // Upsert guidance data
      const guidanceCount = await upsertGuidanceData(guidanceData)
      console.log(`Upserted ${guidanceCount} guidance records`)
    }
    
    console.log('Data fetch completed successfully!')
    
    return {
      date,
      earningsCount,
      marketCount,
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

export { main as fetchTodayData }
