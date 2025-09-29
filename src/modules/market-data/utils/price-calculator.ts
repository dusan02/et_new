/**
 * 💰 PRICE CALCULATOR - CENTRALIZED PRICING LOGIC
 * Jeden zdroj pravdy pre všetky price calculations
 * Nahradzuje duplicitný kód v rôznych častiach aplikácie
 */

import { BigInt } from '@/modules/shared/utils/bigint.utils'

export interface PriceCalculationInput {
  currentPrice: number | null
  previousClose: number | null
  sharesOutstanding: bigint | null
  ticker: string
}

export interface PriceCalculationResult {
  priceChangePercent: number | null
  marketCap: bigint | null
  marketCapDiff: number | null
  marketCapDiffBillions: number | null
  size: 'Mega' | 'Large' | 'Mid' | 'Small' | null
  isValid: boolean
  validationErrors: string[]
}

export class PriceCalculator {
  // Thresholds pre company size
  private static readonly SIZE_THRESHOLDS = {
    MEGA: 100_000_000_000,    // > $100B
    LARGE: 10_000_000_000,    // $10B - $100B
    MID: 2_000_000_000,       // $2B - $10B
    // < $2B = Small
  }

  // Thresholds pre validation
  private static readonly VALIDATION_THRESHOLDS = {
    MAX_PRICE: 10000,         // $10,000 max price
    MAX_SHARES: 100000000000, // 100B shares max
    MAX_PRICE_CHANGE: 50,     // 50% max price change
    MAX_MARKET_CAP_CHANGE: 100 // 100% max market cap change
  }

  /**
   * Hlavná metóda pre výpočet všetkých price-related hodnôt
   */
  static calculateAll(input: PriceCalculationInput): PriceCalculationResult {
    const errors: string[] = []

    // 1. Validuj vstupy
    const validation = this.validateInputs(input)
    if (!validation.isValid) {
      return {
        priceChangePercent: null,
        marketCap: null,
        marketCapDiff: null,
        marketCapDiffBillions: null,
        size: null,
        isValid: false,
        validationErrors: validation.errors
      }
    }

    try {
      // 2. Vypočítaj price change percent
      const priceChangePercent = this.calculatePriceChange(
        input.currentPrice!,
        input.previousClose!
      )

      // 3. Validuj price change
      if (!this.validatePriceChange(priceChangePercent, input.ticker)) {
        return {
          priceChangePercent: null,
          marketCap: null,
          marketCapDiff: null,
          marketCapDiffBillions: null,
          size: null,
          isValid: false,
          validationErrors: [`Extreme price change: ${priceChangePercent.toFixed(2)}%`]
        }
      }

      // 4. Vypočítaj market cap
      const marketCap = this.calculateMarketCap(
        input.currentPrice!,
        input.sharesOutstanding!
      )

      // 5. Vypočítaj market cap difference
      const marketCapDiff = this.calculateMarketCapDiff(
        input.currentPrice!,
        input.previousClose!,
        input.sharesOutstanding!
      )

      // 6. Validuj market cap change
      if (!this.validateMarketCapChange(marketCapDiff, input.ticker)) {
        return {
          priceChangePercent,
          marketCap,
          marketCapDiff: null,
          marketCapDiffBillions: null,
          size: this.determineCompanySize(marketCap),
          isValid: false,
          validationErrors: [`Extreme market cap change: ${marketCapDiff.toFixed(2)}%`]
        }
      }

      // 7. Vypočítaj market cap diff v miliardách
      const marketCapDiffBillions = this.calculateMarketCapDiffBillions(
        input.currentPrice!,
        input.previousClose!,
        input.sharesOutstanding!
      )

      // 8. Určite company size
      const size = this.determineCompanySize(marketCap)

      return {
        priceChangePercent,
        marketCap,
        marketCapDiff,
        marketCapDiffBillions,
        size,
        isValid: true,
        validationErrors: []
      }

    } catch (error) {
      return {
        priceChangePercent: null,
        marketCap: null,
        marketCapDiff: null,
        marketCapDiffBillions: null,
        size: null,
        isValid: false,
        validationErrors: [`Calculation error for ${input.ticker}: ${error}`]
      }
    }
  }

  /**
   * Vypočítaj percentuálnu zmenu ceny
   */
  static calculatePriceChange(currentPrice: number, previousClose: number): number {
    if (!currentPrice || !previousClose || previousClose <= 0) {
      return 0
    }
    return ((currentPrice - previousClose) / previousClose) * 100
  }

  /**
   * Vypočítaj market cap
   */
  static calculateMarketCap(currentPrice: number, sharesOutstanding: bigint): bigint {
    return BigInt(Math.round(currentPrice * Number(sharesOutstanding)))
  }

  /**
   * Vypočítaj percentuálnu zmenu market cap
   */
  static calculateMarketCapDiff(
    currentPrice: number, 
    previousClose: number, 
    sharesOutstanding: bigint
  ): number {
    const currentMarketCap = this.calculateMarketCap(currentPrice, sharesOutstanding)
    const prevMarketCap = this.calculateMarketCap(previousClose, sharesOutstanding)
    
    return Number(currentMarketCap - prevMarketCap) / Number(prevMarketCap) * 100
  }

  /**
   * Vypočítaj absolútnu zmenu market cap v miliardách
   */
  static calculateMarketCapDiffBillions(
    currentPrice: number, 
    previousClose: number, 
    sharesOutstanding: bigint
  ): number {
    const currentMarketCap = this.calculateMarketCap(currentPrice, sharesOutstanding)
    const prevMarketCap = this.calculateMarketCap(previousClose, sharesOutstanding)
    
    return Number(currentMarketCap - prevMarketCap) / 1e9
  }

  /**
   * Určite veľkosť spoločnosti na základe market cap
   */
  static determineCompanySize(marketCap: bigint | null): 'Mega' | 'Large' | 'Mid' | 'Small' | null {
    if (!marketCap) return null

    const marketCapFloat = Number(marketCap)
    
    if (marketCapFloat > this.SIZE_THRESHOLDS.MEGA) return 'Mega'
    if (marketCapFloat >= this.SIZE_THRESHOLDS.LARGE) return 'Large'
    if (marketCapFloat >= this.SIZE_THRESHOLDS.MID) return 'Mid'
    return 'Small'
  }

  /**
   * Validuj vstupné dáta
   */
  private static validateInputs(input: PriceCalculationInput): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!input.currentPrice) {
      errors.push(`Missing current price for ${input.ticker}`)
    }
    if (!input.previousClose) {
      errors.push(`Missing previous close for ${input.ticker}`)
    }
    if (!input.sharesOutstanding) {
      errors.push(`Missing shares outstanding for ${input.ticker}`)
    }

    if (errors.length > 0) {
      return { isValid: false, errors }
    }

    // Validuj hodnoty
    if (input.currentPrice! <= 0) {
      errors.push(`Invalid current price for ${input.ticker}: ${input.currentPrice}`)
    }
    if (input.previousClose! <= 0) {
      errors.push(`Invalid previous close for ${input.ticker}: ${input.previousClose}`)
    }
    if (input.sharesOutstanding! <= BigInt(0)) {
      errors.push(`Invalid shares outstanding for ${input.ticker}: ${input.sharesOutstanding}`)
    }

    // Validuj extreme hodnoty
    if (input.currentPrice! > this.VALIDATION_THRESHOLDS.MAX_PRICE) {
      errors.push(`Suspicious current price for ${input.ticker}: $${input.currentPrice}`)
    }
    if (input.previousClose! > this.VALIDATION_THRESHOLDS.MAX_PRICE) {
      errors.push(`Suspicious previous close for ${input.ticker}: $${input.previousClose}`)
    }
    if (input.sharesOutstanding! > this.VALIDATION_THRESHOLDS.MAX_SHARES) {
      errors.push(`Suspicious shares outstanding for ${input.ticker}: ${input.sharesOutstanding}`)
    }

    return { isValid: errors.length === 0, errors }
  }

  /**
   * Validuj price change
   */
  private static validatePriceChange(priceChange: number, ticker: string): boolean {
    if (Math.abs(priceChange) > this.VALIDATION_THRESHOLDS.MAX_PRICE_CHANGE) {
      console.warn(`Extreme price change detected for ${ticker}: ${priceChange.toFixed(2)}%`)
      return false
    }
    return true
  }

  /**
   * Validuj market cap change
   */
  private static validateMarketCapChange(marketCapDiff: number, ticker: string): boolean {
    if (Math.abs(marketCapDiff) > this.VALIDATION_THRESHOLDS.MAX_MARKET_CAP_CHANGE) {
      console.warn(`Extreme market cap change detected for ${ticker}: ${marketCapDiff.toFixed(2)}%`)
      return false
    }
    return true
  }

  /**
   * Utility metóda pre fallback calculations
   */
  static calculateWithFallback(
    currentPrice: number | null,
    previousClose: number | null,
    sharesOutstanding: bigint | null,
    ticker: string
  ): PriceCalculationResult {
    // Ak nemáme current price, použijeme previous close
    const effectiveCurrentPrice = currentPrice || previousClose
    
    return this.calculateAll({
      currentPrice: effectiveCurrentPrice,
      previousClose: previousClose!,
      sharesOutstanding,
      ticker
    })
  }
}
