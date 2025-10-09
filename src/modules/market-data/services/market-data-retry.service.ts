/**
 * 💰 MARKET DATA MODULE - Enhanced Service with Retry Logic
 * Business logic pre market data operations with retry and error handling
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
import { 
  retryWithBackoff, 
  batchRetryWithBackoff, 
  logFailedTickers, 
  checkSuccessRate 
} from '../../../lib/market-data-retry'
import { logger } from '../../../lib/logger'

export class MarketDataRetryService {
  private repository: MarketDataRepository

  constructor() {
    this.repository = new MarketDataRepository()
  }

  /**
   * Enhanced market data processing with retry logic
   * @param rawData - Raw market data from Polygon API
   * @param reportDate - Report date
   * @returns Object with success/failure counts and detailed errors
   */
  async processMarketDataWithRetry(
    rawData: Record<string, any>, 
    reportDate: Date
  ): Promise<{
    ok: number
    failed: number
    errors: Array<{ticker: string, reason: string}>
    successRate: number
    failedTickers: Array<{ticker: string, error: string}>
  }> {
    const start = Date.now()
    const tickers = Object.keys(rawData)
    
    logger.info(`Starting enhanced market data processing`, {
      tickerCount: tickers.length,
      reportDate: reportDate.toISOString().slice(0, 10)
    })
    
    const processedData: CreateMarketDataInput[] = []
    const failedTickers: Array<{ticker: string, error: string}> = []
    
    // Process each ticker with retry logic
    for (const ticker of tickers) {
      try {
        const marketInfo = rawData[ticker]
        
        if (!marketInfo || typeof marketInfo !== 'object') {
          logger.warn(`Invalid market data for ticker`, { ticker })
          failedTickers.push({ ticker, error: 'Invalid market data structure' })
          continue
        }

        // Process with retry logic for data validation
        const processedItem = await retryWithBackoff(async () => {
          return this.processSingleTicker(ticker, marketInfo, reportDate)
        }, {
          maxRetries: 3,
          baseDelay: 500,
          maxDelay: 5000
        })

        if (processedItem) {
          processedData.push(processedItem)
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`Failed to process ticker after retries`, {
          ticker,
          error: errorMessage
        })
        failedTickers.push({ ticker, error: errorMessage })
      }
    }

    // Batch save with retry
    let saveResult: { ok: number; failed: number; errors: Array<{ticker: string, reason: string}> }
    
    try {
      saveResult = await retryWithBackoff(async () => {
        return await this.repository.batchUpsert(processedData)
      }, {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000
      })
    } catch (error) {
      logger.error(`Failed to save market data after retries`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        processedCount: processedData.length
      })
      
      saveResult = {
        ok: 0,
        failed: processedData.length,
        errors: processedData.map(item => ({
          ticker: item.ticker,
          reason: 'Database save failed after retries'
        }))
      }
    }

    // Log failed tickers for analysis
    if (failedTickers.length > 0) {
      logFailedTickers(failedTickers, `marketdata-errors-${reportDate.toISOString().slice(0, 10)}.log`)
    }

    // Check success rate
    const totalAttempts = tickers.length
    const totalSuccessful = saveResult.ok
    const successRateCheck = checkSuccessRate(totalSuccessful, totalAttempts, 70)

    if (!successRateCheck.meetsThreshold) {
      logger.error(`Market data success rate below threshold`, {
        successRate: successRateCheck.rate,
        threshold: 70,
        message: successRateCheck.message
      })
    }

    const duration = Date.now() - start
    logger.info(`Enhanced market data processing completed`, {
      duration: `${duration}ms`,
      totalTickers: totalAttempts,
      successful: totalSuccessful,
      failed: saveResult.failed,
      successRate: `${successRateCheck.rate.toFixed(1)}%`,
      meetsThreshold: successRateCheck.meetsThreshold
    })

    return {
      ...saveResult,
      successRate: successRateCheck.rate,
      failedTickers
    }
  }

  /**
   * Process single ticker data with validation
   */
  private async processSingleTicker(
    ticker: string,
    marketInfo: any,
    reportDate: Date
  ): Promise<CreateMarketDataInput | null> {
    // Validate ticker format
    if (!/^[A-Z]{1,5}$/.test(ticker)) {
      throw new Error(`Invalid ticker format: ${ticker}`)
    }

    // Calculate market cap and validate
    const calculationInput: MarketCapCalculationInput = {
      currentPrice: marketInfo.currentPrice || null,
      previousClose: marketInfo.previousClose || null,
      sharesOutstanding: marketInfo.sharesOutstanding || null,
      ticker
    }

    const calculation = calculateMarketCapDifference(calculationInput)
    
    // Enhanced filtering logic
    const hasCurrentPrice = marketInfo.currentPrice && marketInfo.currentPrice > 0
    const hasMarketCap = calculation.marketCap && calculation.marketCap > 0
    const hasSharesOutstanding = marketInfo.sharesOutstanding && marketInfo.sharesOutstanding > 0
    
    if (!hasCurrentPrice && !hasMarketCap && !hasSharesOutstanding) {
      logger.debug(`Skipping ticker with no useful data`, {
        ticker,
        currentPrice: marketInfo.currentPrice,
        marketCap: calculation.marketCap,
        sharesOutstanding: marketInfo.sharesOutstanding
      })
      return null
    }
    
    // Validate price data
    const priceValidation = validatePriceData(
      marketInfo.currentPrice,
      marketInfo.previousClose,
      ticker
    )

    if (!priceValidation.isValid) {
      logger.warn(`Price validation failed for ticker`, {
        ticker,
        errors: priceValidation.errors
      })
    }

    return {
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
    }
  }

  /**
   * Get market data for specific date with enhanced statistics
   */
  async getMarketDataForDate(reportDate: Date): Promise<{
    data: MarketData[]
    statistics: {
      totalCompanies: number
      withCurrentPrice: number
      withPriceChange: number
      avgPriceChange: number | null
      totalMarketCapChange: number | null
      successRate: number
    }
    topPerformers: TopPerformersResult
  }> {
    const [data, statistics, topPerformers] = await Promise.all([
      this.repository.findByDate(reportDate),
      this.repository.getStatistics(reportDate),
      this.repository.getTopPerformers(reportDate)
    ])

    // Calculate success rate
    const totalWithData = data.length
    const withCurrentPrice = data.filter(d => d.currentPrice && d.currentPrice > 0).length
    const successRate = totalWithData > 0 ? (withCurrentPrice / totalWithData) * 100 : 0

    return { 
      data, 
      statistics: { ...statistics, successRate },
      topPerformers 
    }
  }

  /**
   * Validate ticker before processing
   */
  async validateTicker(ticker: string): Promise<{
    isValid: boolean
    isActive: boolean
    reason?: string
  }> {
    try {
      // Check if ticker exists in earnings data (basic validation)
      const exists = await this.repository.count({ ticker })
      
      return {
        isValid: /^[A-Z]{1,5}$/.test(ticker),
        isActive: exists > 0,
        reason: exists === 0 ? 'Ticker not found in earnings data' : undefined
      }
    } catch (error) {
      return {
        isValid: false,
        isActive: false,
        reason: error instanceof Error ? error.message : 'Validation error'
      }
    }
  }

  /**
   * Get health status of market data service
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    metrics: {
      totalRecords: number
      recentSuccessRate: number
      lastUpdate: string | null
    }
    issues: string[]
  }> {
    const issues: string[] = []
    
    try {
      // Get recent data (last 7 days)
      const recentDate = new Date()
      recentDate.setDate(recentDate.getDate() - 7)
      
      const recentData = await this.repository.findByDate(recentDate)
      const totalRecords = recentData.length
      
      const withCurrentPrice = recentData.filter(d => d.currentPrice && d.currentPrice > 0).length
      const recentSuccessRate = totalRecords > 0 ? (withCurrentPrice / totalRecords) * 100 : 0
      
      const lastUpdate = recentData.length > 0 
        ? recentData[0].updatedAt?.toISOString() || null 
        : null

      // Determine health status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
      
      if (recentSuccessRate < 50) {
        status = 'unhealthy'
        issues.push(`Low success rate: ${recentSuccessRate.toFixed(1)}%`)
      } else if (recentSuccessRate < 70) {
        status = 'degraded'
        issues.push(`Moderate success rate: ${recentSuccessRate.toFixed(1)}%`)
      }
      
      if (totalRecords === 0) {
        status = 'unhealthy'
        issues.push('No recent market data found')
      }
      
      if (!lastUpdate) {
        status = 'degraded'
        issues.push('No recent updates detected')
      }

      return {
        status,
        metrics: {
          totalRecords,
          recentSuccessRate,
          lastUpdate
        },
        issues
      }
      
    } catch (error) {
      return {
        status: 'unhealthy',
        metrics: {
          totalRecords: 0,
          recentSuccessRate: 0,
          lastUpdate: null
        },
        issues: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  // Delegate other methods to original service
  async getTopPerformers(reportDate: Date, limit: number = 5): Promise<TopPerformersResult> {
    return await this.repository.getTopPerformers(reportDate, limit)
  }

  async searchMarketData(filters: MarketDataFilters): Promise<MarketData[]> {
    return await this.repository.findWithFilters(filters)
  }

  async getMarketDataHistory(ticker: string, limit: number = 10): Promise<MarketData[]> {
    const data = await this.repository.findByTicker(ticker)
    return data.slice(0, limit)
  }

  calculateMarketCapDifference(input: MarketCapCalculationInput): MarketCapCalculationResult {
    return calculateMarketCapDifference(input)
  }

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

  async hasDataForDate(reportDate: Date): Promise<boolean> {
    const count = await this.repository.count({ reportDate })
    return count > 0
  }

  async getCount(filters: MarketDataFilters = {}): Promise<number> {
    return await this.repository.count(filters)
  }
}
