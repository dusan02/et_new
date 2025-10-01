/**
 * 💰 MARKET DATA MODULE - Market Cap Utilities
 * Helper functions pre market cap calculations
 */

import { 
  MarketCapCalculationInput,
  ValidatedMarketCapInput,
  MarketCapCalculationResult,
  MARKET_CAP_THRESHOLDS
} from '../types'
import { PriceCalculator } from './price-calculator'

/**
 * Validate inputs for market cap calculation
 * @param input - Market cap calculation input
 * @returns Validation result with clean values
 */
export function validateMarketCapInputs(
  input: MarketCapCalculationInput
): { isValid: boolean; data?: ValidatedMarketCapInput; errors: string[] } {
  const errors: string[] = []
  const { currentPrice, previousClose, sharesOutstanding, ticker } = input

  // Check for null values
  if (!currentPrice) {
    errors.push(`Missing current price for ${ticker}`)
  }
  if (!previousClose) {
    errors.push(`Missing previous close for ${ticker}`)
  }
  // sharesOutstanding is optional - we can calculate market cap without it
  // if (!sharesOutstanding) {
  //   errors.push(`Missing shares outstanding for ${ticker}`)
  // }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  // Check for invalid values
  if (currentPrice! <= 0) {
    errors.push(`Invalid current price for ${ticker}: ${currentPrice}`)
  }
  if (previousClose! <= 0) {
    errors.push(`Invalid previous close for ${ticker}: ${previousClose}`)
  }
  if (sharesOutstanding! <= 0) {
    errors.push(`Invalid shares outstanding for ${ticker}: ${sharesOutstanding}`)
  }

  // Check for extreme values
  if (currentPrice! > 10000) {
    errors.push(`Suspicious current price for ${ticker}: $${currentPrice}`)
  }
  if (previousClose! > 10000) {
    errors.push(`Suspicious previous close for ${ticker}: $${previousClose}`)
  }
  if (sharesOutstanding! > BigInt('100000000000')) { // 100B shares
    errors.push(`Suspicious shares outstanding for ${ticker}: ${sharesOutstanding}`)
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  return {
    isValid: true,
    data: {
      currentPrice: currentPrice!,
      previousClose: previousClose!,
      sharesOutstanding: sharesOutstanding!,
      ticker
    },
    errors: []
  }
}

/**
 * Calculate market cap difference with validation
 * @deprecated Use PriceCalculator.calculateAll instead
 * @param input - Market cap calculation input
 * @returns Calculation result with validation
 */
export function calculateMarketCapDifference(
  input: MarketCapCalculationInput
): MarketCapCalculationResult {
  // Deleguj na nový PriceCalculator
  const result = PriceCalculator.calculateAll({
    currentPrice: input.currentPrice,
    previousClose: input.previousClose,
    sharesOutstanding: input.sharesOutstanding,
    ticker: input.ticker
  })

  // Konvertuj na starý formát pre kompatibilitu
  return {
    marketCap: result.marketCap,
    marketCapDiff: result.marketCapDiff,
    marketCapDiffBillions: result.marketCapDiffBillions,
    size: result.size,
    priceChangePercent: result.priceChangePercent,
    isValid: result.isValid,
    validationErrors: result.validationErrors
  }
}

/**
 * Determine company size based on market cap
 * @param marketCap - Market capitalization in actual value
 * @returns Company size category
 */
export function determineCompanySize(
  marketCap: bigint | null
): 'Mega' | 'Large' | 'Mid' | 'Small' | null {
  if (!marketCap || marketCap <= 0) {
    return null
  }

  const marketCapNumber = Number(marketCap)
  
  if (marketCapNumber >= MARKET_CAP_THRESHOLDS.MEGA) {
    return 'Mega'
  } else if (marketCapNumber >= MARKET_CAP_THRESHOLDS.LARGE) {
    return 'Large'
  } else if (marketCapNumber >= MARKET_CAP_THRESHOLDS.MID) {
    return 'Mid'
  } else {
    return 'Small'
  }
}

/**
 * Format market cap for display
 * @param marketCap - Market cap in actual value
 * @returns Formatted string (e.g., "15.5B", "2.3T")
 */
export function formatMarketCap(marketCap: bigint | null): string {
  if (!marketCap || marketCap <= 0) {
    return '-'
  }

  const value = Number(marketCap)
  
  if (value >= 1e12) {
    return `${(value / 1e12).toFixed(1)}T`
  } else if (value >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`
  } else if (value >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`
  } else if (value >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`
  } else {
    return value.toString()
  }
}

/**
 * Format market cap difference for display
 * @param diffBillions - Difference in billions
 * @returns Formatted string with sign
 */
export function formatMarketCapDiff(diffBillions: number | null): string {
  if (diffBillions === null) {
    return '-'
  }

  const abs = Math.abs(diffBillions)
  const sign = diffBillions >= 0 ? '+' : '-'
  
  if (abs >= 1000) {
    return `${sign}${(abs / 1000).toFixed(1)}T`
  } else if (abs >= 1) {
    return `${sign}${abs.toFixed(1)}B`
  } else {
    return `${sign}${(abs * 1000).toFixed(0)}M`
  }
}

/**
 * Calculate price change percentage
 * @param currentPrice - Current price
 * @param previousClose - Previous close price
 * @returns Price change percentage or null
 */
export function calculatePriceChangePercent(
  currentPrice: number | null,
  previousClose: number | null
): number | null {
  if (!currentPrice || !previousClose || previousClose === 0) {
    return null
  }
  
  return ((currentPrice - previousClose) / previousClose) * 100
}

/**
 * Validate price data
 * @param currentPrice - Current price
 * @param previousClose - Previous close price
 * @param ticker - Stock ticker
 * @returns Validation result
 */
export function validatePriceData(
  currentPrice: number | null,
  previousClose: number | null,
  ticker: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (currentPrice !== null && currentPrice <= 0) {
    errors.push(`Invalid current price for ${ticker}: ${currentPrice}`)
  }

  if (previousClose !== null && previousClose <= 0) {
    errors.push(`Invalid previous close for ${ticker}: ${previousClose}`)
  }

  if (currentPrice && previousClose) {
    const changePercent = Math.abs(calculatePriceChangePercent(currentPrice, previousClose) || 0)
    if (changePercent > 100) {
      errors.push(`Extreme price change for ${ticker}: ${changePercent.toFixed(2)}%`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
