/**
 * 🔄 UNIFIED DATA FETCHER SERVICE
 * Centralizovaný servis pre načítavanie dát z externých API
 * Nahradzuje duplicitný kód medzi fetch-today.ts a fetch-data-now.js
 */

import axios from 'axios'
import { 
  MarketDataService,
  CreateMarketDataInput,
  calculateMarketCapDifference,
  validateMarketCapInputs 
} from '@/modules/market-data'
import { 
  EarningsService,
  CreateEarningsInput 
} from '@/modules/earnings'
import { isoDate, getNYTimeString } from '@/modules/shared/utils/date.utils'
import { retryWithBackoff, batchFetch } from '@/utils/fetchers'

export interface FetchResult {
  success: boolean
  earningsCount: number
  marketCount: number
  totalTickers: number
  errors: string[]
}

export interface UnifiedFetchOptions {
  date?: string
  maxRetries?: number
  batchSize?: number
  delayBetweenBatches?: number
}

export class UnifiedDataFetcher {
  private earningsService: EarningsService
  private marketDataService: MarketDataService
  private finnhubApiKey: string
  private polygonApiKey: string

  constructor() {
    this.earningsService = new EarningsService()
    this.marketDataService = new MarketDataService()
    this.finnhubApiKey = process.env.FINNHUB_API_KEY!
    this.polygonApiKey = process.env.POLYGON_API_KEY!
  }

  /**
   * Hlavná metóda pre načítanie všetkých dát
   */
  async fetchAllData(options: UnifiedFetchOptions = {}): Promise<FetchResult> {
    const date = options.date || isoDate()
    const errors: string[] = []

    console.log(`🚀 Starting unified data fetch for ${date} (NY time: ${getNYTimeString()})`)

    try {
      // 1. Načítaj earnings dáta
      console.log('📊 Fetching earnings data from Finnhub...')
      const earningsData = await this.fetchEarningsData(date)
      console.log(`✅ Found ${earningsData.length} earnings records`)

      // 2. Ulož earnings dáta
      const earningsCount = await this.saveEarningsData(earningsData)
      console.log(`✅ Saved ${earningsCount} earnings records`)

      // 3. Získaj unique tickers pre market dáta
      const tickers = Array.from(new Set(earningsData.map(e => e.ticker).filter(Boolean))) as string[]
      
      let marketCount = 0
      if (tickers.length > 0) {
        console.log(`📈 Fetching market data for ${tickers.length} tickers...`)
        const marketData = await this.fetchMarketData(tickers, options)
        console.log(`✅ Found market data for ${Object.keys(marketData).length} tickers`)
        
        // 4. Ulož market dáta
        marketCount = await this.saveMarketData(marketData, new Date(date))
        console.log(`✅ Saved ${marketCount} market records`)
      }

      console.log('🎉 Unified data fetch completed successfully!')

      return {
        success: true,
        earningsCount,
        marketCount,
        totalTickers: tickers.length,
        errors
      }

    } catch (error) {
      const errorMessage = `Error in unified fetch process: ${error}`
      console.error(errorMessage)
      errors.push(errorMessage)
      
      return {
        success: false,
        earningsCount: 0,
        marketCount: 0,
        totalTickers: 0,
        errors
      }
    }
  }

  /**
   * Načítaj earnings dáta z Finnhub API
   */
  private async fetchEarningsData(date: string): Promise<any[]> {
    const url = 'https://finnhub.io/api/v1/calendar/earnings'
    
    const { data } = await retryWithBackoff(
      () => axios.get(url, { 
        params: { from: date, to: date, token: this.finnhubApiKey },
        timeout: 30000 
      }),
      { maxRetries: 3, baseDelay: 1000, maxDelay: 10000 }
    )

    if (!data?.earningsCalendar) {
      throw new Error('No earnings calendar data received from Finnhub')
    }

    return data.earningsCalendar.map((earning: any) => ({
      ticker: earning.symbol,
      reportTime: earning.hour === 'bmo' ? 'BMO' : earning.hour === 'amc' ? 'AMC' : 'TNS',
      epsActual: earning.epsActual || null,
      epsEstimate: earning.epsEstimate || null,
      revenueActual: earning.revenueActual ? BigInt(Math.round(earning.revenueActual)) : null,
      revenueEstimate: earning.revenueEstimate ? BigInt(Math.round(earning.revenueEstimate)) : null,
      sector: earning.sector || null,
      companyType: 'Public',
      dataSource: 'Finnhub-Earnings',
      fiscalPeriod: earning.quarter || null,
      fiscalYear: earning.year || null,
      primaryExchange: earning.exchange || null
    }))
  }

  /**
   * Načítaj market dáta z Polygon API s optimalizovaným batch processing
   */
  private async fetchMarketData(tickers: string[], options: UnifiedFetchOptions): Promise<Record<string, any>> {
    const marketData: Record<string, any> = {}
    const batchSize = options.batchSize || 10
    const delayBetweenBatches = options.delayBetweenBatches || 1000

    // Rozdeľ tickers do batchov
    const batches: string[][] = []
    for (let i = 0; i < tickers.length; i += batchSize) {
      batches.push(tickers.slice(i, i + batchSize))
    }

    console.log(`📦 Processing ${tickers.length} tickers in ${batches.length} batches of ${batchSize}`)

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} items`)

      const batchResults = await batchFetch(
        batch,
        async (ticker) => this.fetchSingleTickerData(ticker),
        {
          batchSize: batch.length,
          retryOptions: { maxRetries: 3, baseDelay: 1000, maxDelay: 10000 },
          delayBetweenBatches: 0 // Delay je medzi batchmi, nie vnútri batchu
        }
      )

      // Spracuj výsledky
      batchResults.forEach((result, index) => {
        const ticker = batch[index]
        if (result.success && result.data) {
          marketData[ticker] = result.data
        } else {
          console.warn(`❌ Failed to fetch market data for ${ticker}: ${result.error}`)
        }
      })

      // Delay medzi batchmi
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
      }
    }

    return marketData
  }

  /**
   * Načítaj dáta pre jeden ticker
   */
  private async fetchSingleTickerData(ticker: string): Promise<any> {
    try {
      // 1. Získaj previous close
      const { data: prevData } = await retryWithBackoff(
        () => axios.get(
          `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev`,
          { params: { apikey: this.polygonApiKey }, timeout: 10000 }
        ),
        { maxRetries: 3, baseDelay: 1000, maxDelay: 10000 }
      )

      const prevClose = prevData?.results?.[0]?.c
      if (!prevClose) {
        throw new Error(`No previous close data for ${ticker}`)
      }

      // 2. Získaj current price (s fallback na snapshot)
      let current = prevClose
      let todaysChangePerc = null

      try {
        const { data: snapshotData } = await retryWithBackoff(
          () => axios.get(
            `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`,
            { params: { apikey: this.polygonApiKey }, timeout: 10000 }
          ),
          { maxRetries: 2, baseDelay: 1000, maxDelay: 5000 }
        )

        current = snapshotData?.ticker?.lastTrade?.p || prevClose
        todaysChangePerc = snapshotData?.ticker?.todaysChangePerc || null
      } catch (error) {
        console.warn(`Failed to fetch snapshot for ${ticker}, using prev close:`, (error as Error).message)
      }

      // 3. Získaj company name
      let companyName = ticker
      try {
        const { data: profileData } = await retryWithBackoff(
          () => axios.get(
            `https://api.polygon.io/v3/reference/tickers/${ticker}`,
            { params: { apikey: this.polygonApiKey }, timeout: 10000 }
          ),
          { maxRetries: 2, baseDelay: 1000, maxDelay: 5000 }
        )
        companyName = profileData?.results?.name || ticker
      } catch (error) {
        console.warn(`Failed to fetch company name for ${ticker}:`, error)
      }

      // 4. Získaj shares outstanding
      let sharesOutstanding = null
      try {
        const { data: profileData } = await retryWithBackoff(
          () => axios.get(
            `https://api.polygon.io/v3/reference/tickers/${ticker}`,
            { params: { apikey: this.polygonApiKey }, timeout: 10000 }
          ),
          { maxRetries: 2, baseDelay: 1000, maxDelay: 5000 }
        )
        sharesOutstanding = profileData?.results?.share_class_shares_outstanding || null
      } catch (error) {
        console.warn(`Failed to fetch shares outstanding for ${ticker}:`, error)
      }

      // 5. Vypočítaj price change percent
      const priceChangePercent = current ? 
        (todaysChangePerc !== null ? todaysChangePerc : ((current - prevClose) / prevClose) * 100) : 0

      // 6. Validuj extreme price changes
      if (Math.abs(priceChangePercent) > 50) {
        console.warn(`Extreme price change detected for ${ticker}: ${priceChangePercent.toFixed(2)}% (${prevClose} -> ${current}). Setting to null.`)
        return null
      }

      // 7. Vypočítaj market cap a cap diff pomocou centralizovanej logiky
      const calculationResult = calculateMarketCapDifference({
        currentPrice: current || prevClose,
        previousClose: prevClose,
        sharesOutstanding: sharesOutstanding ? BigInt(sharesOutstanding) : null,
        ticker
      })

      // 8. Určite company size
      let size = null
      if (calculationResult.marketCap) {
        const marketCapFloat = Number(calculationResult.marketCap)
        if (marketCapFloat > 100_000_000_000) size = "Mega"
        else if (marketCapFloat >= 10_000_000_000) size = "Large"
        else if (marketCapFloat >= 2_000_000_000) size = "Mid"
        else size = "Small"
      }

      return {
        ticker,
        currentPrice: current || prevClose,
        previousClose: prevClose,
        priceChangePercent,
        companyName: companyName || ticker,
        size,
        marketCap: calculationResult.marketCap,
        marketCapDiff: calculationResult.marketCapDiff,
        marketCapDiffBillions: calculationResult.marketCapDiffBillions,
        sharesOutstanding,
        companyType: 'Public',
        primaryExchange: 'NYSE' // Default, môže byť vylepšené
      }

    } catch (error) {
      console.warn(`Failed to fetch market data for ${ticker}:`, error)
      return null
    }
  }

  /**
   * Ulož earnings dáta do databázy
   */
  private async saveEarningsData(earningsData: any[]): Promise<number> {
    let savedCount = 0

    for (const earning of earningsData) {
      try {
        await this.earningsService.createOrUpdate({
          reportDate: new Date(earning.reportDate || isoDate()),
          ticker: earning.ticker,
          reportTime: earning.reportTime,
          epsActual: earning.epsActual,
          epsEstimate: earning.epsEstimate,
          revenueActual: earning.revenueActual,
          revenueEstimate: earning.revenueEstimate,
          sector: earning.sector,
          dataSource: earning.dataSource,
          fiscalPeriod: earning.fiscalPeriod,
          fiscalYear: earning.fiscalYear,
        })
        savedCount++
      } catch (error) {
        console.error(`Error saving earnings data for ${earning.ticker}:`, error)
      }
    }

    return savedCount
  }

  /**
   * Ulož market dáta do databázy
   */
  private async saveMarketData(marketData: Record<string, any>, reportDate: Date): Promise<number> {
    const processedData: CreateMarketDataInput[] = []

    for (const [ticker, data] of Object.entries(marketData)) {
      if (!data) continue

      processedData.push({
        ticker,
        reportDate,
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
        primaryExchange: data.primaryExchange
      })
    }

    return await this.marketDataService.processMarketData(marketData, reportDate)
  }
}
