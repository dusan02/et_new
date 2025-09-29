/**
 * 🔍 DATA QUALITY VALIDATOR
 * Centralizovaný validator pre kontrolu kvality dát z externých API
 */

export interface DataQualityIssue {
  type: 'MISSING_DATA' | 'INVALID_DATA' | 'EXTREME_VALUE' | 'API_ERROR'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
  ticker?: string
  field?: string
  value?: any
  expected?: any
}

export interface ValidationResult {
  isValid: boolean
  issues: DataQualityIssue[]
  score: number // 0-100, kde 100 je perfektná kvalita
}

export class DataQualityValidator {
  private static readonly THRESHOLDS = {
    // Price validation
    MIN_PRICE: 0.001,
    MAX_PRICE: 10000,
    MAX_PRICE_CHANGE_PERCENT: 50,
    
    // Market cap validation
    MIN_MARKET_CAP: 1000, // $1K
    MAX_MARKET_CAP: 10000000000000, // $10T
    MAX_MARKET_CAP_CHANGE_PERCENT: 100,
    
    // Shares outstanding validation
    MIN_SHARES: 1000,
    MAX_SHARES: 1000000000000, // 1T shares
    
    // EPS validation
    MIN_EPS: -1000,
    MAX_EPS: 1000,
    
    // Revenue validation
    MIN_REVENUE: 0,
    MAX_REVENUE: 1000000000000, // $1T
  }

  /**
   * Validuje earnings data
   */
  static validateEarningsData(data: any, ticker: string): ValidationResult {
    const issues: DataQualityIssue[] = []
    
    // Kontrola povinných polí
    if (!data.ticker) {
      issues.push({
        type: 'MISSING_DATA',
        severity: 'CRITICAL',
        message: 'Missing ticker symbol',
        ticker,
        field: 'ticker'
      })
    }
    
    if (!data.reportDate) {
      issues.push({
        type: 'MISSING_DATA',
        severity: 'HIGH',
        message: 'Missing report date',
        ticker,
        field: 'reportDate'
      })
    }
    
    // Kontrola EPS dát
    if (data.epsActual !== null && data.epsActual !== undefined) {
      if (data.epsActual < this.THRESHOLDS.MIN_EPS || data.epsActual > this.THRESHOLDS.MAX_EPS) {
        issues.push({
          type: 'EXTREME_VALUE',
          severity: 'MEDIUM',
          message: `EPS Actual value is extreme: ${data.epsActual}`,
          ticker,
          field: 'epsActual',
          value: data.epsActual,
          expected: `${this.THRESHOLDS.MIN_EPS} to ${this.THRESHOLDS.MAX_EPS}`
        })
      }
    }
    
    if (data.epsEstimate !== null && data.epsEstimate !== undefined) {
      if (data.epsEstimate < this.THRESHOLDS.MIN_EPS || data.epsEstimate > this.THRESHOLDS.MAX_EPS) {
        issues.push({
          type: 'EXTREME_VALUE',
          severity: 'MEDIUM',
          message: `EPS Estimate value is extreme: ${data.epsEstimate}`,
          ticker,
          field: 'epsEstimate',
          value: data.epsEstimate,
          expected: `${this.THRESHOLDS.MIN_EPS} to ${this.THRESHOLDS.MAX_EPS}`
        })
      }
    }
    
    // Kontrola Revenue dát
    if (data.revenueActual !== null && data.revenueActual !== undefined) {
      if (data.revenueActual < this.THRESHOLDS.MIN_REVENUE || data.revenueActual > this.THRESHOLDS.MAX_REVENUE) {
        issues.push({
          type: 'EXTREME_VALUE',
          severity: 'MEDIUM',
          message: `Revenue Actual value is extreme: ${data.revenueActual}`,
          ticker,
          field: 'revenueActual',
          value: data.revenueActual,
          expected: `${this.THRESHOLDS.MIN_REVENUE} to ${this.THRESHOLDS.MAX_REVENUE}`
        })
      }
    }
    
    return this.calculateResult(issues)
  }

  /**
   * Validuje market data
   */
  static validateMarketData(data: any, ticker: string): ValidationResult {
    const issues: DataQualityIssue[] = []
    
    // Kontrola povinných polí
    if (!data.ticker) {
      issues.push({
        type: 'MISSING_DATA',
        severity: 'CRITICAL',
        message: 'Missing ticker symbol',
        ticker,
        field: 'ticker'
      })
    }
    
    // Kontrola cien
    if (data.currentPrice !== null && data.currentPrice !== undefined) {
      if (data.currentPrice < this.THRESHOLDS.MIN_PRICE || data.currentPrice > this.THRESHOLDS.MAX_PRICE) {
        issues.push({
          type: 'EXTREME_VALUE',
          severity: 'HIGH',
          message: `Current price is extreme: $${data.currentPrice}`,
          ticker,
          field: 'currentPrice',
          value: data.currentPrice,
          expected: `$${this.THRESHOLDS.MIN_PRICE} to $${this.THRESHOLDS.MAX_PRICE}`
        })
      }
    }
    
    if (data.previousClose !== null && data.previousClose !== undefined) {
      if (data.previousClose < this.THRESHOLDS.MIN_PRICE || data.previousClose > this.THRESHOLDS.MAX_PRICE) {
        issues.push({
          type: 'EXTREME_VALUE',
          severity: 'HIGH',
          message: `Previous close is extreme: $${data.previousClose}`,
          ticker,
          field: 'previousClose',
          value: data.previousClose,
          expected: `$${this.THRESHOLDS.MIN_PRICE} to $${this.THRESHOLDS.MAX_PRICE}`
        })
      }
    }
    
    // Kontrola price change
    if (data.priceChangePercent !== null && data.priceChangePercent !== undefined) {
      if (Math.abs(data.priceChangePercent) > this.THRESHOLDS.MAX_PRICE_CHANGE_PERCENT) {
        issues.push({
          type: 'EXTREME_VALUE',
          severity: 'MEDIUM',
          message: `Price change is extreme: ${data.priceChangePercent.toFixed(2)}%`,
          ticker,
          field: 'priceChangePercent',
          value: data.priceChangePercent,
          expected: `±${this.THRESHOLDS.MAX_PRICE_CHANGE_PERCENT}%`
        })
      }
    }
    
    // Kontrola market cap
    if (data.marketCap !== null && data.marketCap !== undefined) {
      const marketCapNumber = Number(data.marketCap)
      if (marketCapNumber < this.THRESHOLDS.MIN_MARKET_CAP || marketCapNumber > this.THRESHOLDS.MAX_MARKET_CAP) {
        issues.push({
          type: 'EXTREME_VALUE',
          severity: 'MEDIUM',
          message: `Market cap is extreme: $${(marketCapNumber / 1e9).toFixed(2)}B`,
          ticker,
          field: 'marketCap',
          value: data.marketCap,
          expected: `$${(this.THRESHOLDS.MIN_MARKET_CAP / 1e9).toFixed(2)}B to $${(this.THRESHOLDS.MAX_MARKET_CAP / 1e9).toFixed(2)}B`
        })
      }
    }
    
    // Kontrola market cap change
    if (data.marketCapDiff !== null && data.marketCapDiff !== undefined) {
      if (Math.abs(data.marketCapDiff) > this.THRESHOLDS.MAX_MARKET_CAP_CHANGE_PERCENT) {
        issues.push({
          type: 'EXTREME_VALUE',
          severity: 'MEDIUM',
          message: `Market cap change is extreme: ${data.marketCapDiff.toFixed(2)}%`,
          ticker,
          field: 'marketCapDiff',
          value: data.marketCapDiff,
          expected: `±${this.THRESHOLDS.MAX_MARKET_CAP_CHANGE_PERCENT}%`
        })
      }
    }
    
    // Kontrola shares outstanding
    if (data.sharesOutstanding !== null && data.sharesOutstanding !== undefined) {
      const sharesNumber = Number(data.sharesOutstanding)
      if (sharesNumber < this.THRESHOLDS.MIN_SHARES || sharesNumber > this.THRESHOLDS.MAX_SHARES) {
        issues.push({
          type: 'EXTREME_VALUE',
          severity: 'MEDIUM',
          message: `Shares outstanding is extreme: ${(sharesNumber / 1e6).toFixed(2)}M`,
          ticker,
          field: 'sharesOutstanding',
          value: data.sharesOutstanding,
          expected: `${(this.THRESHOLDS.MIN_SHARES / 1e6).toFixed(2)}M to ${(this.THRESHOLDS.MAX_SHARES / 1e6).toFixed(2)}M`
        })
      }
    }
    
    return this.calculateResult(issues)
  }

  /**
   * Validuje API response
   */
  static validateApiResponse(response: any, apiName: string, ticker?: string): ValidationResult {
    const issues: DataQualityIssue[] = []
    
    if (!response) {
      issues.push({
        type: 'API_ERROR',
        severity: 'CRITICAL',
        message: `${apiName} API returned null/undefined response`,
        ticker,
        field: 'response'
      })
    } else if (response.error) {
      issues.push({
        type: 'API_ERROR',
        severity: 'HIGH',
        message: `${apiName} API returned error: ${response.error}`,
        ticker,
        field: 'error',
        value: response.error
      })
    } else if (response.status && response.status >= 400) {
      issues.push({
        type: 'API_ERROR',
        severity: 'HIGH',
        message: `${apiName} API returned HTTP ${response.status}`,
        ticker,
        field: 'status',
        value: response.status
      })
    }
    
    return this.calculateResult(issues)
  }

  /**
   * Vypočíta výsledok validácie
   */
  private static calculateResult(issues: DataQualityIssue[]): ValidationResult {
    const criticalIssues = issues.filter(i => i.severity === 'CRITICAL').length
    const highIssues = issues.filter(i => i.severity === 'HIGH').length
    const mediumIssues = issues.filter(i => i.severity === 'MEDIUM').length
    const lowIssues = issues.filter(i => i.severity === 'LOW').length
    
    // Skóre sa počíta ako: 100 - (critical*20 + high*10 + medium*5 + low*1)
    const score = Math.max(0, 100 - (criticalIssues * 20 + highIssues * 10 + mediumIssues * 5 + lowIssues * 1))
    
    return {
      isValid: criticalIssues === 0 && highIssues === 0,
      issues,
      score
    }
  }

  /**
   * Loguje data quality issues
   */
  static logIssues(issues: DataQualityIssue[], context: string): void {
    if (issues.length === 0) return
    
    const criticalIssues = issues.filter(i => i.severity === 'CRITICAL')
    const highIssues = issues.filter(i => i.severity === 'HIGH')
    const mediumIssues = issues.filter(i => i.severity === 'MEDIUM')
    const lowIssues = issues.filter(i => i.severity === 'LOW')
    
    console.log(`🔍 [DATA QUALITY] ${context}:`)
    
    if (criticalIssues.length > 0) {
      console.error(`❌ CRITICAL (${criticalIssues.length}):`, criticalIssues.map(i => `${i.ticker}: ${i.message}`).join(', '))
    }
    
    if (highIssues.length > 0) {
      console.warn(`⚠️ HIGH (${highIssues.length}):`, highIssues.map(i => `${i.ticker}: ${i.message}`).join(', '))
    }
    
    if (mediumIssues.length > 0) {
      console.warn(`⚠️ MEDIUM (${mediumIssues.length}):`, mediumIssues.map(i => `${i.ticker}: ${i.message}`).join(', '))
    }
    
    if (lowIssues.length > 0) {
      console.log(`ℹ️ LOW (${lowIssues.length}):`, lowIssues.map(i => `${i.ticker}: ${i.message}`).join(', '))
    }
  }
}
