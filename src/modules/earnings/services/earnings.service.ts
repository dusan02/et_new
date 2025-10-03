/**
 * 📊 EARNINGS MODULE - Service Layer
 * Business logic pre earnings operations
 */

import { EarningsRepository } from '../repositories'
import { 
  EarningsData, 
  EarningsStats, 
  EarningsFilters, 
  EarningsQueryResult,
  CreateEarningsInput,
  EarningsCalendarEntry
} from '../types'
import { 
  calculateEarningsSurprise, 
  hasActuals, 
  hasEstimates,
  normalizeTicker 
} from '../utils'
import { applyEarningsFallback } from '../../../services/earnings/fallback'
import { nul } from '../../../lib/db-nulls'
import { sanitizeEarningsData } from '../../../utils/sanitize-earnings'

export class EarningsService {
  private repository: EarningsRepository

  constructor() {
    this.repository = new EarningsRepository()
  }

  /**
   * Get earnings data for specific date with statistics
   * @param reportDate - Report date
   * @returns Earnings data with calculated statistics
   */
  async getEarningsForDate(reportDate: Date): Promise<{
    data: EarningsQueryResult[]
    stats: EarningsStats
  }> {
    const data = await this.repository.findWithSurprises(reportDate)
    const stats = this.calculateStats(data)
    
    return { data, stats }
  }

  /**
   * Get earnings calendar for date range
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Array of calendar entries
   */
  async getEarningsCalendar(
    startDate: Date, 
    endDate: Date
  ): Promise<EarningsCalendarEntry[]> {
    const filters: EarningsFilters = {
      reportDate: startDate // This would need to be updated for date range
    }
    
    const earnings = await this.repository.findWithFilters(filters)
    
    return earnings.map(earning => ({
      ticker: earning.ticker,
      reportDate: earning.reportDate,
      reportTime: earning.reportTime as 'BMO' | 'AMC' | 'TNS' | null,
      fiscalPeriod: earning.fiscalPeriod ?? null,
      fiscalYear: earning.fiscalYear ?? null,
      hasEstimates: hasEstimates(earning.epsEstimate ?? null, earning.revenueEstimate ?? null),
      hasActuals: hasActuals(earning.epsActual ?? null, earning.revenueActual ?? null)
    }))
  }

  /**
   * Process and save earnings data from external source
   * @param rawData - Raw earnings data from API
   * @param reportDate - Report date
   * @returns Number of processed records
   */
  async processEarningsData(
    rawData: any[], 
    reportDate: Date
  ): Promise<number> {
    const processedData: CreateEarningsInput[] = []
    
    for (const item of rawData) {
      const ticker = normalizeTicker(item.symbol || item.ticker)
      if (!ticker) {
        console.warn(`Invalid ticker: ${item.symbol || item.ticker}`)
        continue
      }

      // Convert hour format from Finnhub to our format
      let reportTime: 'BMO' | 'AMC' | 'TNS' | undefined
      switch (item.hour) {
        case 'bmo':
        case 'before-market-open':
          reportTime = 'BMO'
          break
        case 'amc':
        case 'after-market-close':
          reportTime = 'AMC'
          break
        default:
          reportTime = 'TNS'
      }

      // Convert revenue from millions to actual value if needed
      let revenueActual = item.revenueActual 
        ? BigInt(Math.round(Number(item.revenueActual) * 1000000))
        : undefined
      const revenueEstimate = item.revenueEstimate 
        ? BigInt(Math.round(Number(item.revenueEstimate) * 1000000))
        : undefined

      // Apply fallback for missing actual values
      console.log(`[TRACE] ${ticker} pre-fallback`, {
        a: String(item.epsActual), ae: String(item.epsEstimate),
        r: String(item.revenueActual), re: String(item.revenueEstimate),
      });

      // 🚫 DISABLED: Don't create duplicates - if actual values are not available, keep them as null
      // This was causing EPS Act = EPS Est and Rev Act = Rev Est when actual values weren't released yet
      /*
      const { out, usedEpsFallback, usedRevenueFallback } = applyEarningsFallback({
        epsActual: item.epsActual,
        epsEstimate: item.epsEstimate,
        revenueActual,
        revenueEstimate,
      });

      if (usedEpsFallback || usedRevenueFallback) {
        console.log(`🔄 Fallback applied for ${ticker} [EPS:${usedEpsFallback?'Y':'-'} | REV:${usedRevenueFallback?'Y':'-'}]`);
      }
      */
      
      // Use original values without fallback
      const out = {
        epsActual: item.epsActual,
        epsEstimate: item.epsEstimate,
        revenueActual: revenueActual ? Number(revenueActual) : undefined,
        revenueEstimate: revenueEstimate ? Number(revenueEstimate) : undefined,
      };

      // 🛡️ FINAL GUARD: Sanitize to prevent any duplicates
      const sanitized = sanitizeEarningsData(out);
      console.log(`[GUARD] ${ticker} sanitized: epsA=${sanitized.epsActual} epsE=${sanitized.epsEstimate} revA=${sanitized.revenueActual} revE=${sanitized.revenueEstimate}`);

      console.log(`[TRACE] ${ticker} post-fallback`, {
        a: String(sanitized.epsActual), ae: String(sanitized.epsEstimate),
        r: String(sanitized.revenueActual), re: String(sanitized.revenueEstimate),
      });

      // 2) Normalizuj undefined → null (bez zmeny 0n!)
      const prismaData = {
        reportDate,
        ticker,
        reportTime,
        epsActual: sanitized.epsActual ?? undefined,
        epsEstimate: sanitized.epsEstimate ?? undefined,
        revenueActual: sanitized.revenueActual ? BigInt(sanitized.revenueActual) : undefined,
        revenueEstimate: sanitized.revenueEstimate ? BigInt(sanitized.revenueEstimate) : undefined,
        fiscalPeriod: item.quarter ? `Q${item.quarter}` : undefined,
        fiscalYear: item.year || undefined,
        dataSource: 'finnhub'
      };

      processedData.push(prismaData)
    }

    return await this.repository.batchUpsert(processedData)
  }

  /**
   * Calculate comprehensive earnings statistics
   * @param earnings - Array of earnings data
   * @returns EarningsStats object
   */
  private calculateStats(earnings: EarningsQueryResult[]): EarningsStats {
    const totalCompanies = earnings.length
    
    // Count actuals
    const withEpsActual = earnings.filter(e => e.epsActual !== null).length
    const withRevenueActual = earnings.filter(e => e.revenueActual !== null).length
    const withBothActual = earnings.filter(e => 
      e.epsActual !== null && e.revenueActual !== null
    ).length
    const withoutAnyActual = earnings.filter(e => 
      e.epsActual === null && e.revenueActual === null
    ).length

    // Calculate surprise statistics
    const epsSuprises = earnings
      .map(e => e.epsSurprise)
      .filter(s => s !== null) as number[]
    
    const revenueSuprises = earnings
      .map(e => e.revenueSurprise)
      .filter(s => s !== null) as number[]

    const avgEpsSurprise = epsSuprises.length > 0 
      ? epsSuprises.reduce((sum, s) => sum + s, 0) / epsSuprises.length
      : null

    const avgRevenueSurprise = revenueSuprises.length > 0
      ? revenueSuprises.reduce((sum, s) => sum + s, 0) / revenueSuprises.length
      : null

    const positiveEpsSurprises = epsSuprises.filter(s => s > 0).length
    const negativeEpsSurprises = epsSuprises.filter(s => s < 0).length
    const positiveRevenueSurprises = revenueSuprises.filter(s => s > 0).length
    const negativeRevenueSurprises = revenueSuprises.filter(s => s < 0).length

    return {
      totalCompanies,
      withEpsActual,
      withRevenueActual,
      withBothActual,
      withoutAnyActual,
      avgEpsSurprise,
      avgRevenueSurprise,
      positiveEpsSurprises,
      negativeEpsSurprises,
      positiveRevenueSurprises,
      negativeRevenueSurprises
    }
  }

  /**
   * Get earnings by ticker with history
   * @param ticker - Stock ticker
   * @param limit - Number of records to return
   * @returns Array of earnings data
   */
  async getEarningsHistory(
    ticker: string, 
    limit: number = 10
  ): Promise<EarningsData[]> {
    const normalizedTicker = normalizeTicker(ticker)
    if (!normalizedTicker) {
      throw new Error(`Invalid ticker: ${ticker}`)
    }

    const earnings = await this.repository.findByTicker(normalizedTicker)
    return earnings.slice(0, limit)
  }

  /**
   * Search earnings with filters
   * @param filters - Search filters
   * @returns Filtered earnings data
   */
  async searchEarnings(filters: EarningsFilters): Promise<EarningsData[]> {
    return await this.repository.findWithFilters(filters)
  }

  /**
   * Get available filter options
   * @returns Object with available filter values
   */
  async getFilterOptions(): Promise<{
    sectors: string[]
    fiscalPeriods: string[]
  }> {
    const [sectors, fiscalPeriods] = await Promise.all([
      this.repository.getUniqueSectors(),
      this.repository.getUniqueFiscalPeriods()
    ])

    return { sectors, fiscalPeriods }
  }

  /**
   * Validate earnings data
   * @param data - Earnings data to validate
   * @returns Validation result
   */
  validateEarningsData(data: CreateEarningsInput): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!data.ticker || !normalizeTicker(data.ticker)) {
      errors.push('Invalid ticker format')
    }

    if (!data.reportDate || !(data.reportDate instanceof Date)) {
      errors.push('Invalid report date')
    }

    if (data.reportTime && !['BMO', 'AMC', 'TNS'].includes(data.reportTime)) {
      errors.push('Invalid report time')
    }

    if (data.fiscalYear && (data.fiscalYear < 2000 || data.fiscalYear > 2030)) {
      errors.push('Invalid fiscal year')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Create or update earnings data
   * @param data - CreateEarningsInput data
   * @returns Created/updated earnings data
   */
  async createOrUpdate(data: CreateEarningsInput): Promise<EarningsData> {
    return await this.repository.upsert(data)
  }
}
