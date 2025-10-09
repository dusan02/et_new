/**
 * 🔄 UNIFIED DATA FETCHER SERVICE
 * Centralizovaný servis pre načítavanie dát z externých API
 * Nahradzuje duplicitný kód medzi fetch-today.ts a fetch-data-now.js
 */

import axios from 'axios'
import { DataFallbackService } from '../../shared/fallback/data-fallback.service'
import { DataQualityValidator } from '../../shared/validation/data-quality.validator'
import { toBigIntOrNull } from '@/modules/shared'
import { getMarketStatus, getLastTrade, getOpenClose } from '../../market-data/providers/polygon'
import { format } from 'date-fns'
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz'

// Normalizovaný error handling
type HttpErrorInfo = {
  name: 'HttpError';
  status: number;
  url: string;
  body?: unknown;
  message: string;
};

const toErrorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : typeof e === 'string' ? e : JSON.stringify(e);

export class HttpError extends Error {
  status: number;
  url: string;
  body?: unknown;
  constructor(info: HttpErrorInfo) {
    super(info.message);
    this.name = info.name;
    this.status = info.status;
    this.url = info.url;
    this.body = info.body;
  }
}
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
import { isoDate, getNYTimeString, toReportDateUTC } from '@/modules/shared/utils/date.utils'
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

// Helper: vráti YYYY-MM-DD v ET (pre open-close)
const todayET = () => {
  const now = new Date();
  const et = utcToZonedTime(now, "America/New_York");
  return format(et, "yyyy-MM-dd", { timeZone: "America/New_York" });
};

function pctChange(a: number, b: number): number | null {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) return null;
  return ((a - b) / b) * 100;
}

async function computeRealtimeChangeForPremarket(ticker: string, prevClose: number): Promise<{ currentPrice: number | null; priceChangePercent: number | null; source: string }> {
  // 1) skúsiť last trade (extended hours) - môže byť 403 Forbidden
  try {
    const { price: ltPrice } = await getLastTrade(ticker);
    if (Number.isFinite(ltPrice) && Number.isFinite(prevClose) && ltPrice !== prevClose) {
      return { currentPrice: ltPrice!, priceChangePercent: pctChange(ltPrice!, prevClose)!, source: "last_trade" };
    }
  } catch (error) {
    console.warn(`[PREMARKET] ${ticker}: Last trade not available (403/plan limit), trying fallback`);
  }

  // 2) fallback: open-close pre dnešný deň (premarket field)
  try {
    const oc = await getOpenClose(ticker, todayET());
    if (Number.isFinite(oc.preMarket) && Number.isFinite(prevClose) && oc.preMarket !== prevClose) {
      return { currentPrice: oc.preMarket!, priceChangePercent: pctChange(oc.preMarket!, prevClose)!, source: "open_close.premarket" };
    }
  } catch (error) {
    console.warn(`[PREMARKET] ${ticker}: Open-close not available, using snapshot fallback`);
  }

  // 3) nič (zatiaľ) → vráť null a nechaj FE zobraziť "—"
  return { currentPrice: null, priceChangePercent: null, source: "none" };
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
        
        // 🚫 FILTER: Remove tickers without market cap before saving
        const filteredMarketData = this.filterTickersWithMarketCap(marketData)
        const filteredCount = Object.keys(filteredMarketData).length
        const skippedCount = Object.keys(marketData).length - filteredCount
        
        if (skippedCount > 0) {
          console.log(`🚫 Filtered out ${skippedCount} tickers without market cap (small companies)`)
        }
        
        // 4. Ulož market dáta (normalize date to UTC midnight)
        const reportDate = toReportDateUTC(new Date(date))
        const marketResult = await this.saveMarketData(filteredMarketData, reportDate)
        marketCount = marketResult.ok
        
        if (marketResult.failed > 0) {
          const marketErrors = marketResult.errors.map(e => `Market data error for ${e.ticker}: ${e.reason}`)
          errors.push(...marketErrors)
          console.error(`❌ Market data save had ${marketResult.failed} failures`)
        }
        
        console.log(`✅ Saved ${marketCount} market records (${marketResult.failed} failed)`)
        // 5. Clear cache after successful data save
        try {
          const clearedCount = await clearCacheByPattern('earnings-*');
          const marketClearedCount = await clearCacheByPattern('market-*');
          console.log(`🧹 Cleared ${clearedCount + marketClearedCount} cache entries after data save`);
        } catch (cacheError) {
          console.warn('⚠️ Cache clear after save failed:', cacheError);
        }
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

    return data.earningsCalendar.map((earning: any) => {
      const baseData = {
        ticker: earning.symbol,
        reportTime: earning.hour === 'bmo' ? 'BMO' : earning.hour === 'amc' ? 'AMC' : 'TNS',
        epsActual: earning.epsActual || null,
        epsEstimate: earning.epsEstimate || null,
        revenueActual: toBigIntOrNull(earning.revenueActual),
        revenueEstimate: toBigIntOrNull(earning.revenueEstimate),
        sector: earning.sector || null,
        companyType: 'Public',
        dataSource: 'Finnhub-Earnings',
        fiscalPeriod: earning.quarter || null,
        fiscalYear: earning.year || null,
        primaryExchange: earning.exchange || null
      }

      // 🚫 DISABLED: Don't create duplicates - if actual values are not available, keep them as null
      // This was causing EPS Act = EPS Est and Rev Act = Rev Est when actual values weren't released yet
      /*
      if (!baseData.epsActual && baseData.epsEstimate) {
        baseData.epsActual = baseData.epsEstimate
        baseData._fallback_applied = 'use_estimate_as_actual_eps'
      }

      if (!baseData.revenueActual && baseData.revenueEstimate) {
        baseData.revenueActual = baseData.revenueEstimate
        baseData._fallback_applied = baseData._fallback_applied 
          ? `${baseData._fallback_applied},use_estimate_as_actual_revenue`
          : 'use_estimate_as_actual_revenue'
      }
      */

      console.log(`[UPSERT EARN] ${earning.ticker} epsA:${baseData.epsActual} epsE:${baseData.epsEstimate} revA:${baseData.revenueActual} revE:${baseData.revenueEstimate} -> NO FALLBACK APPLIED`)

      return baseData
    })
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
          const errorMsg = result.error || 'No error message available'
          // Rozlišuj medzi "očakávanými" a "skutočnými" chybami
          if (errorMsg.includes('[MARKET:fail]')) {
            console.warn(`❌ ${errorMsg}`)
          } else {
            console.debug(`[MARKET:partial] ${ticker}: ${errorMsg}`)
          }
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
      if (!prevClose || prevClose <= 0) {
        throw new Error(`No valid previous close data for ${ticker} (value: ${prevClose})`)
      }

      // 2. Získaj current price (s fallback na snapshot)
      let current = prevClose
      let todaysChangePerc = null
      let snapshotData: any = null

      try {
        const { data } = await retryWithBackoff(
          () => axios.get(
            `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`,
            { params: { apikey: this.polygonApiKey }, timeout: 10000 }
          ),
          { maxRetries: 2, baseDelay: 1000, maxDelay: 5000 }
        )
        snapshotData = data

        // Use minute data (min.c) as current price (realtime) - available with basic plan
        const dayClose = snapshotData?.ticker?.day?.c
        const minClose = snapshotData?.ticker?.min?.c  // Minute data - available with basic plan
        const todaysChange = snapshotData?.ticker?.todaysChange
        const prevDayClose = snapshotData?.ticker?.prevDay?.c ?? prevClose
        
        if (minClose && minClose !== prevClose) {
          current = minClose
          console.log(`[SNAPSHOT] ${ticker} using min.c: ${current}`)
        } else if (dayClose && dayClose !== prevClose) {
          current = dayClose
          console.log(`[SNAPSHOT] ${ticker} using day.c: ${current}`)
        } else if (todaysChange !== null && todaysChange !== undefined && Number.isFinite(prevDayClose)) {
          // Calculate current price from todaysChange
          current = prevDayClose + todaysChange
          console.log(`[SNAPSHOT] ${ticker} using todaysChange: ${prevDayClose} + ${todaysChange} = ${current}`)
        } else {
          // No reliable current price available - will set priceChangePercent to null
          current = prevClose
          console.log(`[SNAPSHOT] ${ticker} using prevClose fallback: ${current}`)
        }
        todaysChangePerc = snapshotData?.ticker?.todaysChangePerc || null
      } catch (error) {
        console.warn(`Failed to fetch snapshot for ${ticker}, using prev close:`, (error as Error).message)
        // Continue with prevClose as current price - don't fail the entire ticker
      }

      // 3. Získaj company name a sector
      let companyName = ticker
      let sector = null
      try {
        const { data: profileData } = await retryWithBackoff(
          () => axios.get(
            `https://api.polygon.io/v3/reference/tickers/${ticker}`,
            { params: { apikey: this.polygonApiKey }, timeout: 10000 }
          ),
          { maxRetries: 2, baseDelay: 1000, maxDelay: 5000 }
        )
        companyName = profileData?.results?.name || ticker
        sector = profileData?.results?.sic_description || null
      } catch (error) {
        console.warn(`Failed to fetch company name and sector for ${ticker}:`, error)
        // Continue with ticker as company name - don't fail the entire ticker
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
        // Continue without shares outstanding - don't fail the entire ticker
      }

      // 5. Vypočítaj price change percent s premarket logikou
      let priceChangePercent: number | null = null;
      
      // Detekcia obchodnej seansy
      const status = await getMarketStatus();
      const isPremarket = !!status?.earlyHours;
      
      if (isPremarket) {
        // PREMARKET: skús najprv realtime sources, potom snapshot fallback
        const pre = await computeRealtimeChangeForPremarket(ticker, prevClose);
        if (pre.priceChangePercent !== null) {
          current = pre.currentPrice ?? prevClose;
          priceChangePercent = pre.priceChangePercent;
          console.log(`[PREMARKET] ${ticker} prevClose=${prevClose} using=${pre.source} -> current=${current} chg%=${priceChangePercent}`);
        } else {
          // Fallback na snapshot dáta ak realtime sources nefungujú
          if (snapshotData?.ticker) {
            const todaysChangePerc = snapshotData.ticker.todaysChangePerc;
            const todaysChange = snapshotData.ticker.todaysChange;
            const prevDayClose = snapshotData.ticker.prevDay?.c ?? prevClose;
            
            if (todaysChangePerc !== null && todaysChangePerc !== undefined) {
              // Použi snapshot todaysChangePerc
              priceChangePercent = todaysChangePerc;
              if (todaysChange !== null && todaysChange !== undefined && Number.isFinite(prevDayClose)) {
                current = prevDayClose + todaysChange;
              } else {
                current = prevClose;
              }
              console.log(`[PREMARKET] ${ticker} using snapshot fallback -> current=${current} chg%=${priceChangePercent}`);
            } else {
              // ak naozaj nebol žiaden premarket trade: null, nie 0
              current = prevClose;
              priceChangePercent = null;
              console.log(`[PREMARKET] ${ticker} no premarket data -> chg% = null`);
            }
          } else {
            // snapshot sa nepodarilo načítať
            current = prevClose;
            priceChangePercent = null;
            console.log(`[PREMARKET] ${ticker} snapshot failed -> chg% = null`);
          }
        }
      } else {
        // REGULAR/AFTER-HOURS: doterajšia logika, ale s override heuristikou
        if (snapshotData?.ticker) {
          const todaysChangePerc = snapshotData.ticker.todaysChangePerc;
          const todaysChange = snapshotData.ticker.todaysChange;
          const dayClose = snapshotData.ticker.day?.c;
          const prevDayClose = snapshotData.ticker.prevDay?.c ?? prevClose;

          if (Number.isFinite(dayClose) && dayClose > 0) {
            current = dayClose;
            priceChangePercent = pctChange(dayClose, prevDayClose);
          } else if (todaysChange != null && Number.isFinite(prevDayClose)) {
            current = prevDayClose + todaysChange;
            priceChangePercent = pctChange(current, prevDayClose);
          }
        }

        // Override: ak percento vyšlo 0 alebo null, porovnaj s last trade
        if ((priceChangePercent === 0 || priceChangePercent === null) && Number.isFinite(prevDayClose)) {
          const { price: ltPrice } = await getLastTrade(ticker);
          const overridePct = (Number.isFinite(ltPrice) ? pctChange(ltPrice!, prevDayClose) : null);
          if (overridePct !== null && Math.abs(overridePct) >= 0.01) { // > 0.01 % threshold
            current = ltPrice!;
            priceChangePercent = overridePct;
            console.log(`[OVERRIDE] ${ticker} snapshot chg%=${todaysChangePerc} -> last_trade chg%=${overridePct}`);
          }
        }
      }

      // 6. Validuj extreme price changes
      if (priceChangePercent != null && Math.abs(priceChangePercent) > 50) {
        console.warn(`Extreme price change detected for ${ticker}: ${priceChangePercent.toFixed(2)}% (${prevClose} -> ${current}). Setting to null.`)
        priceChangePercent = null; // nezastavuj celý záznam, len zneplatni change
      }

      // 7. Vypočítaj market cap a cap diff pomocou centralizovanej logiky
      const calculationResult = calculateMarketCapDifference({
        currentPrice: current || prevClose,
        previousClose: prevClose,
        sharesOutstanding: sharesOutstanding ? BigInt(sharesOutstanding) : null,
        ticker
      })

      // 8. Použi vypočítaný priceChangePercent
      const finalPriceChangePercent = priceChangePercent;

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
        priceChangePercent: finalPriceChangePercent,
        companyName: companyName || ticker,
        sector,
        size,
        marketCap: calculationResult.marketCap,
        marketCapDiff: calculationResult.marketCapDiff,
        marketCapDiffBillions: calculationResult.marketCapDiffBillions,
        sharesOutstanding,
        companyType: 'Public',
        primaryExchange: 'NYSE' // Default, môže byť vylepšené
      }

    } catch (error) {
      // Normalizuj error message
      const msg = toErrorMessage(error);
      const status = (error as any)?.response?.status;
      const errorMsg = `[MARKET:fail] ${ticker}${status ? ` [${status}]` : ''}: ${msg}`;
      throw new Error(errorMsg);
    }
  }

  /**
   * Ulož earnings dáta do databázy
   */
  private async saveEarningsData(earningsData: any[]): Promise<number> {
    // Použi processEarningsData ktorá má fallback logiku (normalize date to UTC midnight)
    const reportDate = toReportDateUTC(new Date(isoDate()))
    return await this.earningsService.processEarningsData(earningsData, reportDate)
  }

  /**
   * Ulož market dáta do databázy
   */
  private async saveMarketData(marketData: Record<string, any>, reportDate: Date): Promise<{
    ok: number
    failed: number
    errors: Array<{ticker: string, reason: string}>
  }> {
    console.log(`[UNIFIED] Saving ${Object.keys(marketData).length} market data records`)
    
    const result = await this.marketDataService.processMarketData(marketData, reportDate)
    
    console.log(`[UNIFIED] Market data save result: ok=${result.ok}, failed=${result.failed}`)
    if (result.failed > 0) {
      console.error(`[UNIFIED] Market data save errors:`, result.errors.slice(0, 5))
    }
    
    return result
  }

  /**
   * 🎯 OPTIMIZED: Fetch only earnings data (no market data)
   * Used in the first step of the optimized workflow
   */
  async fetchEarningsOnly(date: Date): Promise<{earningsCount: number, tickersCount: number}> {
    console.log('🎯 [EARNINGS-ONLY] Starting earnings-only fetch...')
    
    const reportDate = toReportDateUTC(date)
    
    // 1. Fetch earnings data from Finnhub
    const dateStr = format(date, 'yyyy-MM-dd')
    const earningsData = await this.fetchEarningsData(dateStr)
    const earningsCount = Object.keys(earningsData).length
    
    console.log(`📊 [EARNINGS-ONLY] Found ${earningsCount} earnings records`)
    
    // 2. Save earnings data
    const earningsResult = await this.saveEarningsData(earningsData, reportDate)
    
    console.log(`✅ [EARNINGS-ONLY] Saved ${earningsResult.ok} earnings records`)
    
    return {
      earningsCount: earningsResult.ok,
      tickersCount: earningsCount
    }
  }

  /**
   * 🎯 OPTIMIZED: Fetch market data only for specific tickers
   * Used in the second step of the optimized workflow
   */
  async fetchMarketDataForTickers(tickers: string[], date: Date): Promise<{marketCount: number, filteredCount: number, skippedCount: number}> {
    console.log(`🎯 [MARKET-FILTERED] Starting market data fetch for ${tickers.length} tickers...`)
    
    const reportDate = toReportDateUTC(date)
    
    // 1. Fetch market data only for specified tickers
    const marketData = await this.fetchMarketDataForTickersList(tickers, date)
    const marketCount = Object.keys(marketData).length
    
    console.log(`📊 [MARKET-FILTERED] Found market data for ${marketCount} tickers`)
    
    // 2. Apply market cap filter
    const filteredMarketData = this.filterTickersWithMarketCap(marketData)
    const filteredCount = Object.keys(filteredMarketData).length
    const skippedCount = marketCount - filteredCount
    
    if (skippedCount > 0) {
      console.log(`🚫 [MARKET-FILTERED] Filtered out ${skippedCount} tickers without market cap (small companies)`)
    }
    
    // 3. Save filtered market data
    const marketResult = await this.saveMarketData(filteredMarketData, reportDate)
    
    console.log(`✅ [MARKET-FILTERED] Saved ${marketResult.ok} market records`)
    
    return {
      marketCount,
      filteredCount: marketResult.ok,
      skippedCount
    }
  }

  /**
   * 🎯 OPTIMIZED: Fetch market data for specific ticker list
   */
  private async fetchMarketDataForTickersList(tickers: string[], date: Date): Promise<Record<string, any>> {
    console.log(`📊 [MARKET-FILTERED] Fetching market data for ${tickers.length} specific tickers...`)
    
    const marketData: Record<string, any> = {}
    
    // Process tickers in batches to avoid rate limits
    const batchSize = 10
    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize)
      console.log(`📦 [MARKET-FILTERED] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(tickers.length/batchSize)} (${batch.length} tickers)`)
      
      const batchPromises = batch.map(async (ticker) => {
        try {
          const data = await this.fetchSingleTickerMarketData(ticker, date)
          if (data) {
            marketData[ticker] = data
          }
        } catch (error) {
          console.error(`❌ [MARKET-FILTERED] Failed to fetch market data for ${ticker}:`, error.message)
        }
      })
      
      await Promise.allSettled(batchPromises)
      
      // Small delay between batches to be nice to APIs
      if (i + batchSize < tickers.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    return marketData
  }

  /**
   * 🎯 OPTIMIZED: Fetch market data for a single ticker
   */
  private async fetchSingleTickerMarketData(ticker: string, date: Date): Promise<any> {
    try {
      // Get current price and market data from Polygon
      const [currentPrice, marketInfo] = await Promise.allSettled([
        this.getCurrentPrice(ticker),
        this.getMarketInfo(ticker)
      ])
      
      const price = currentPrice.status === 'fulfilled' ? currentPrice.value : null
      const info = marketInfo.status === 'fulfilled' ? marketInfo.value : null
      
      if (!price && !info) {
        return null
      }
      
      return {
        currentPrice: price,
        marketCap: info?.marketCap,
        sharesOutstanding: info?.sharesOutstanding,
        companyName: info?.companyName,
        companyType: info?.companyType,
        primaryExchange: info?.primaryExchange
      }
    } catch (error) {
      console.error(`❌ [MARKET-FILTERED] Error fetching market data for ${ticker}:`, error.message)
      return null
    }
  }

  /**
   * 🎯 FETCH MARKET DATA FOR SPECIFIC TICKERS (SIMPLE VERSION)
   * Fetch market data only for the provided ticker list without date parameter
   */
  async fetchMarketDataForTickersSimple(tickers: string[]): Promise<Record<string, any>> {
    console.log(`🔄 Fetching market data for ${tickers.length} specific tickers...`)
    
    const marketData: Record<string, any> = {}
    
    for (const ticker of tickers) {
      try {
        console.log(`📊 Fetching market data for ${ticker}...`)
        
        // Fetch from Polygon
        const polygonData = await this.fetchPolygonMarketData(ticker)
        
        if (polygonData) {
          marketData[ticker] = polygonData
          console.log(`✅ ${ticker}: Got market data`)
        } else {
          console.log(`❌ ${ticker}: No market data from Polygon`)
        }
        
      } catch (error) {
        console.error(`❌ ${ticker}: Market data fetch failed:`, error)
      }
    }
    
    return marketData
  }

  /**
   * 🚫 FILTER: Remove tickers without market cap (small companies)
   * Only keep tickers that have valid market cap data from Polygon
   */
  filterTickersWithMarketCap(marketData: Record<string, any>): Record<string, any> {
    const filtered: Record<string, any> = {}
    
    for (const [ticker, data] of Object.entries(marketData)) {
      if (!data || typeof data !== 'object') {
        console.log(`[FILTER:SKIP] ${ticker}: Invalid data structure`)
        continue
      }

      // Check if we have market cap data
      const hasMarketCap = data.marketCap && data.marketCap > 0
      const hasSharesOutstanding = data.sharesOutstanding && data.sharesOutstanding > 0
      const hasCurrentPrice = data.currentPrice && data.currentPrice > 0
      
      // Skip only if we have no useful data at all (no price, no market cap, no shares)
      if (!hasCurrentPrice && !hasMarketCap && !hasSharesOutstanding) {
        console.log(`[FILTER:SKIP] ${ticker}: No useful data (cap=${data.marketCap}, shares=${data.sharesOutstanding}, price=${data.currentPrice}) - skipping`)
        continue
      }

      filtered[ticker] = data
    }
    
    return filtered
  }
}

export { UnifiedFetcherService };

import { clearCacheByPattern } from '@/lib/cache-wrapper';

