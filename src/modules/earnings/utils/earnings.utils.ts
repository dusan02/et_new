/**
 * 📊 EARNINGS MODULE - Utility Functions
 * Helper functions pre earnings calculations
 */

import { EarningsSurprise, FiscalPeriodInfo } from '../types'

/**
 * Výpočet surprise percentage
 * @param actual - Actual value
 * @param estimate - Estimated value
 * @returns Surprise percentage or null
 */
export function calculateSurprise(
  actual: number | bigint | null, 
  estimate: number | bigint | null
): number | null {
  if (actual === null || estimate === null || estimate === 0) {
    return null
  }
  
  const actualNum = typeof actual === 'bigint' ? Number(actual) : actual
  const estimateNum = typeof estimate === 'bigint' ? Number(estimate) : estimate
  
  return ((actualNum - estimateNum) / Math.abs(estimateNum)) * 100
}

/**
 * Výpočet EPS a Revenue surprise pre ticker
 * @param epsActual - Actual EPS
 * @param epsEstimate - Estimated EPS
 * @param revenueActual - Actual Revenue
 * @param revenueEstimate - Estimated Revenue
 * @returns EarningsSurprise object
 */
export function calculateEarningsSurprise(
  epsActual: number | null,
  epsEstimate: number | null,
  revenueActual: bigint | null,
  revenueEstimate: bigint | null
): EarningsSurprise {
  const epsSurprise = calculateSurprise(epsActual, epsEstimate)
  const revenueSurprise = calculateSurprise(revenueActual, revenueEstimate)
  
  return {
    ticker: '', // Will be filled by caller
    epsSurprise,
    revenueSurprise,
    hasEpsData: epsActual !== null && epsEstimate !== null,
    hasRevenueData: revenueActual !== null && revenueEstimate !== null
  }
}

/**
 * Parse fiscal period info
 * @param fiscalPeriod - Fiscal period string (Q1, Q2, Q3, Q4, FY, H1, H2)
 * @param fiscalYear - Fiscal year
 * @returns FiscalPeriodInfo object
 */
export function parseFiscalPeriod(
  fiscalPeriod: string | null,
  fiscalYear: number | null
): FiscalPeriodInfo | null {
  if (!fiscalPeriod || !fiscalYear) {
    return null
  }
  
  const period = fiscalPeriod.toUpperCase()
  
  return {
    period,
    year: fiscalYear,
    isQuarter: /^Q[1-4]$/.test(period),
    isAnnual: period === 'FY',
    isSemiAnnual: /^H[1-2]$/.test(period)
  }
}

/**
 * Check if earnings data has estimates
 * @param epsEstimate - EPS estimate
 * @param revenueEstimate - Revenue estimate
 * @returns True if has any estimates
 */
export function hasEstimates(
  epsEstimate: number | null,
  revenueEstimate: bigint | null
): boolean {
  return epsEstimate !== null || revenueEstimate !== null
}

/**
 * Check if earnings data has actuals
 * @param epsActual - EPS actual
 * @param revenueActual - Revenue actual
 * @returns True if has any actuals
 */
export function hasActuals(
  epsActual: number | null,
  revenueActual: bigint | null
): boolean {
  return epsActual !== null || revenueActual !== null
}

/**
 * Format report time string
 * @param reportTime - Report time (BMO, AMC, TNS)
 * @returns Formatted string
 */
export function formatReportTime(reportTime: string | null): string {
  switch (reportTime) {
    case 'BMO':
      return 'Before Market Open'
    case 'AMC':
      return 'After Market Close'
    case 'TNS':
      return 'Time Not Specified'
    default:
      return 'Unknown'
  }
}

/**
 * Validate ticker symbol
 * @param ticker - Stock ticker
 * @returns True if valid ticker format
 */
export function isValidTicker(ticker: string): boolean {
  if (!ticker || typeof ticker !== 'string') {
    return false
  }
  
  // Basic ticker validation: 1-5 uppercase letters
  return /^[A-Z]{1,5}$/.test(ticker.trim().toUpperCase())
}

/**
 * Clean and normalize ticker symbol
 * @param ticker - Raw ticker string
 * @returns Normalized ticker or null if invalid
 */
export function normalizeTicker(ticker: string | null): string | null {
  if (!ticker || typeof ticker !== 'string') {
    return null
  }
  
  const cleaned = ticker.trim().toUpperCase()
  return isValidTicker(cleaned) ? cleaned : null
}
