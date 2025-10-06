/**
 * 💰 MARKET DATA MODULE - Service Layer
 * Business logic pre market data operations
 */

import { MarketDataRepository } from '../repositories'
import { 
  MarketData,
  MarketDataFilters,
  TopPerformersResult,
  CreateMarketDataInput,
  MarketCapCalculationInput,
  MarketCapCalculationResult
} from '../types'
import { 
  calculateMarketCapDifference,
  validatePriceData,
  formatMarketCap,
  formatMarketCapDiff
} from '../utils'

export class MarketDataService {
  private repository: MarketDataRepository

  constructor() {
    this.repository = new MarketDataRepository()
  }

  /**
   * Get market data for specific date with statistics
   * @param reportDate - Report date
   * @returns Market data with statistics
   */
  async getMarketDataForDate(reportDate: Date): Promise<{
    data: MarketData[]
    statistics: {
      totalCompanies: number
      withCurrentPrice: number
      withPriceChange: number
      avgPriceChange: number | null
      totalMarketCapChange: number | null
    }
    topPerformers: TopPerformersResult
  }> {
    const [data, statistics, topPerformers] = await Promise.all([
      this.repository.findByDate(reportDate),
      this.repository.getStatistics(reportDate),
      this.repository.getTopPerformers(reportDate)
    ])

    return { data, statistics, topPerformers }
  }

  /**
   * Process and save market data from external API with verify-readback
   * @param rawData - Raw market data from Polygon API
   * @param reportDate - Report date
   * @returns Object with success/failure counts and errors
   */
  async processMarketData(
    rawData: Record<string, any>, 
    reportDate: Date
  ): Promise<{
    ok: number
    failed: number
    errors: Array<{ticker: string, reason: string}>
  }> {
    const start = Date.now()
    console.log(`[MARKET] Processing ${Object.keys(rawData).length} market data records for ${reportDate.toISOString().slice(0,10)}`)
    
    const processedData: CreateMarketDataInput[] = []
    
    for (const [ticker, marketInfo] of Object.entries(rawData)) {
      if (!marketInfo || typeof marketInfo !== 'object') {
        console.warn(`[MARKET] Invalid market data for ${ticker}`)
        continue
      }

      // Calculate market cap and validate
      const calculationInput: MarketCapCalculationInput = {
        currentPrice: marketInfo.currentPrice || null,
        previousClose: marketInfo.previousClose || null,
        sharesOutstanding: marketInfo.sharesOutstanding || null,
        ticker
      }

      const calculation = calculateMarketCapDifference(calculationInput)
      
      // Validate price data
      const priceValidation = validatePriceData(
        marketInfo.currentPrice,
        marketInfo.previousClose,
        ticker
      )

      if (!priceValidation.isValid) {
        console.warn(`[MARKET] Invalid price data for ${ticker}:`, priceValidation.errors)
      }

      processedData.push({
        ticker,
        reportDate,
        companyName: marketInfo.companyName || ticker,
        currentPrice: marketInfo.currentPrice || undefined,
        previousClose: marketInfo.previousClose || undefined,
        marketCap: calculation.marketCap || undefined,
        size: calculation.size || undefined,
        marketCapDiff: calculation.marketCapDiff || undefined,
        marketCapDiffBillions: calculation.marketCapDiffBillions || undefined,
        priceChangePercent: calculation.priceChangePercent !== null && calculation.priceChangePercent !== undefined ? calculation.priceChangePercent : undefined,
        sharesOutstanding: marketInfo.sharesOutstanding || undefined,
        companyType: marketInfo.companyType || 'Public',
        primaryExchange: marketInfo.primaryExchange || undefined
      })
    }

    console.log(`[MARKET] Persisting ${processedData.length} processed records`)
    
    // 1) Database write
    const result = await this.repository.batchUpsert(processedData)
    
    // 2) Verify-readback - check a sample of records to confirm they were written correctly
    if (result.ok > 0) {
      const sampleSize = Math.min(8, processedData.length)
      const sample = processedData.slice(0, sampleSize).map(r => r.ticker)
      
      try {
        const dbRows = await this.repository.findMany({
          where: { 
            reportDate, 
            ticker: { in: sample } 
          },
          select: { 
            ticker: true, 
            currentPrice: true, 
            updatedAt: true 
          }
        })

        const mismatches: string[] = []
        for (const ticker of sample) {
          const wanted = processedData.find(r => r.ticker === ticker)?.currentPrice ?? null
          const got = dbRows.find(d => d.ticker === ticker)?.currentPrice ?? null
          
          if (wanted === null && got === null) continue
          if (wanted === null || got === null) {
            mismatches.push(`${ticker} (in=${wanted}, db=${got})`)
          } else if (Math.abs(Number(wanted) - Number(got)) > 1e-6) {
            mismatches.push(`${ticker} (in=${wanted}, db=${got})`)
          }
        }

        if (mismatches.length > 0) {
          console.error(`[MARKET][VERIFY] Data mismatches detected:`, mismatches)
          // Add verification errors to the result
          result.errors.push(...mismatches.map(m => ({ ticker: m.split(' ')[0], reason: `Verify mismatch: ${m}` })))
          result.failed += mismatches.length
          result.ok -= mismatches.length
        } else {
          console.log(`[MARKET][VERIFY] All ${sampleSize} sample records verified successfully`)
        }
      } catch (verifyError) {
        console.error(`[MARKET][VERIFY] Verification failed:`, verifyError)
        result.errors.push({ ticker: 'VERIFY', reason: `Verification error: ${verifyError}` })
      }
    }

    const duration = Date.now() - start
    console.log(`[MARKET] Process completed in ${duration}ms: ok=${result.ok}, failed=${result.failed}`)
    
    if (result.failed > 0) {
      console.error(`[MARKET] Failures detected:`, result.errors.slice(0, 5))
    }
    
    return result
  }

  /**
   * Get top performers for a date
   * @param reportDate - Report date
   * @param limit - Number of results per category
   * @returns Top performers by various metrics
   */
  async getTopPerformers(
    reportDate: Date, 
    limit: number = 5
  ): Promise<TopPerformersResult> {
    return await this.repository.getTopPerformers(reportDate, limit)
  }

  /**
   * Search market data with filters
   * @param filters - Search filters
   * @returns Filtered market data
   */
  async searchMarketData(filters: MarketDataFilters): Promise<MarketData[]> {
    return await this.repository.findWithFilters(filters)
  }

  /**
   * Get market data history for ticker
   * @param ticker - Stock ticker
   * @param limit - Number of records to return
   * @returns Array of historical market data
   */
  async getMarketDataHistory(
    ticker: string, 
    limit: number = 10
  ): Promise<MarketData[]> {
    const data = await this.repository.findByTicker(ticker)
    return data.slice(0, limit)
  }

  /**
   * Calculate market cap difference for specific inputs
   * @param input - Market cap calculation input
   * @returns Calculation result
   */
  calculateMarketCapDifference(
    input: MarketCapCalculationInput
  ): MarketCapCalculationResult {
    return calculateMarketCapDifference(input)
  }

  /**
   * Get available filter options
   * @returns Object with available filter values
   */
  async getFilterOptions(): Promise<{
    sizes: string[]
    exchanges: string[]
  }> {
    const [sizes, exchanges] = await Promise.all([
      this.repository.getUniqueSizes(),
      this.repository.getUniqueExchanges()
    ])

    return { sizes, exchanges }
  }

  /**
   * Format market data for display
   * @param marketData - Raw market data
   * @returns Formatted market data
   */
  formatMarketDataForDisplay(marketData: MarketData[]): Array<MarketData & {
    formattedMarketCap: string
    formattedMarketCapDiff: string
    formattedPriceChange: string
  }> {
    return marketData.map(data => ({
      ...data,
      formattedMarketCap: formatMarketCap(data.marketCap),
      formattedMarketCapDiff: formatMarketCapDiff(data.marketCapDiffBillions),
      formattedPriceChange: data.priceChangePercent 
        ? `${data.priceChangePercent >= 0 ? '+' : ''}${data.priceChangePercent.toFixed(2)}%`
        : '-'
    }))
  }

  /**
   * Validate market data
   * @param data - Market data to validate
   * @returns Validation result
   */
  validateMarketData(data: CreateMarketDataInput): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!data.ticker || !/^[A-Z]{1,5}$/.test(data.ticker)) {
      errors.push('Invalid ticker format')
    }

    if (!data.reportDate || !(data.reportDate instanceof Date)) {
      errors.push('Invalid report date')
    }

    if (!data.companyName || data.companyName.trim().length === 0) {
      errors.push('Company name is required')
    }

    if (data.currentPrice !== undefined && data.currentPrice !== null && data.currentPrice <= 0) {
      errors.push('Current price must be positive')
    }

    if (data.previousClose !== undefined && data.previousClose !== null && data.previousClose <= 0) {
      errors.push('Previous close must be positive')
    }

    if (data.sharesOutstanding !== undefined && data.sharesOutstanding !== null && data.sharesOutstanding <= 0) {
      errors.push('Shares outstanding must be positive')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Get market data statistics summary
   * @param reportDate - Report date
   * @returns Statistics summary
   */
  async getMarketStatistics(reportDate: Date): Promise<{
    totalCompanies: number
    withCurrentPrice: number
    withPriceChange: number
    avgPriceChange: number | null
    totalMarketCapChange: number | null
    formattedTotalMarketCapChange: string
  }> {
    const stats = await this.repository.getStatistics(reportDate)
    
    return {
      ...stats,
      formattedTotalMarketCapChange: formatMarketCapDiff(stats.totalMarketCapChange)
    }
  }

  /**
   * Check if market data exists for date
   * @param reportDate - Report date
   * @returns True if data exists
   */
  async hasDataForDate(reportDate: Date): Promise<boolean> {
    const count = await this.repository.count({ reportDate })
    return count > 0
  }

  /**
   * Get market data count by filters
   * @param filters - MarketDataFilters object
   * @returns Count of matching records
   */
  async getCount(filters: MarketDataFilters = {}): Promise<number> {
    return await this.repository.count(filters)
  }
}
