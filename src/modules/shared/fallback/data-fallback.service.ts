/**
 * 🔄 DATA FALLBACK SERVICE
 * Centralizované fallback mechanizmy pre missing data
 */

import { DataQualityIssue } from '../validation/data-quality.validator'

export interface FallbackStrategy {
  name: string
  priority: number
  condition: (data: any, issues: DataQualityIssue[]) => boolean
  action: (data: any) => any
}

export interface FallbackResult {
  success: boolean
  data: any
  appliedStrategies: string[]
  remainingIssues: DataQualityIssue[]
}

export class DataFallbackService {
  private static readonly FALLBACK_STRATEGIES: FallbackStrategy[] = [
    // Price fallbacks
    {
      name: 'use_previous_close_as_current',
      priority: 1,
      condition: (data, issues) => 
        !data.currentPrice && data.previousClose && 
        issues.some(i => i.field === 'currentPrice' && i.type === 'MISSING_DATA'),
      action: (data) => ({
        ...data,
        currentPrice: data.previousClose,
        priceChangePercent: 0,
        _fallback_applied: 'use_previous_close_as_current'
      })
    },
    
    {
      name: 'use_current_as_previous',
      priority: 2,
      condition: (data, issues) => 
        !data.previousClose && data.currentPrice && 
        issues.some(i => i.field === 'previousClose' && i.type === 'MISSING_DATA'),
      action: (data) => ({
        ...data,
        previousClose: data.currentPrice,
        priceChangePercent: 0,
        _fallback_applied: 'use_current_as_previous'
      })
    },
    
    // Market cap fallbacks
    {
      name: 'calculate_market_cap_from_price_shares',
      priority: 3,
      condition: (data, issues) => 
        !data.marketCap && data.currentPrice && data.sharesOutstanding &&
        issues.some(i => i.field === 'marketCap' && i.type === 'MISSING_DATA'),
      action: (data) => {
        const marketCap = BigInt(Math.round(data.currentPrice * Number(data.sharesOutstanding)))
        return {
          ...data,
          marketCap,
          _fallback_applied: 'calculate_market_cap_from_price_shares'
        }
      }
    },
    
    {
      name: 'estimate_shares_from_market_cap',
      priority: 4,
      condition: (data, issues) => 
        !data.sharesOutstanding && data.marketCap && data.currentPrice &&
        issues.some(i => i.field === 'sharesOutstanding' && i.type === 'MISSING_DATA'),
      action: (data) => {
        const sharesOutstanding = BigInt(Math.round(Number(data.marketCap) / data.currentPrice))
        return {
          ...data,
          sharesOutstanding,
          _fallback_applied: 'estimate_shares_from_market_cap'
        }
      }
    },
    
    // Company info fallbacks
    {
      name: 'use_ticker_as_company_name',
      priority: 5,
      condition: (data, issues) => 
        !data.companyName && data.ticker &&
        issues.some(i => i.field === 'companyName' && i.type === 'MISSING_DATA'),
      action: (data) => ({
        ...data,
        companyName: data.ticker,
        _fallback_applied: 'use_ticker_as_company_name'
      })
    },
    
    {
      name: 'set_default_company_type',
      priority: 6,
      condition: (data, issues) => 
        !data.companyType &&
        issues.some(i => i.field === 'companyType' && i.type === 'MISSING_DATA'),
      action: (data) => ({
        ...data,
        companyType: 'Public',
        _fallback_applied: 'set_default_company_type'
      })
    },
    
    {
      name: 'set_default_exchange',
      priority: 7,
      condition: (data, issues) => 
        !data.primaryExchange &&
        issues.some(i => i.field === 'primaryExchange' && i.type === 'MISSING_DATA'),
      action: (data) => ({
        ...data,
        primaryExchange: 'NYSE',
        _fallback_applied: 'set_default_exchange'
      })
    },
    
    // Size classification fallback
    {
      name: 'classify_size_from_market_cap',
      priority: 8,
      condition: (data, issues) => 
        !data.size && data.marketCap &&
        issues.some(i => i.field === 'size' && i.type === 'MISSING_DATA'),
      action: (data) => {
        const marketCapNumber = Number(data.marketCap)
        let size = 'Small'
        
        if (marketCapNumber >= 100_000_000_000) {
          size = 'Mega'
        } else if (marketCapNumber >= 10_000_000_000) {
          size = 'Large'
        } else if (marketCapNumber >= 2_000_000_000) {
          size = 'Mid'
        }
        
        return {
          ...data,
          size,
          _fallback_applied: 'classify_size_from_market_cap'
        }
      }
    },
    
    // EPS fallbacks
    {
      name: 'use_estimate_as_actual_eps',
      priority: 9,
      condition: (data, issues) => 
        !data.epsActual && data.epsEstimate &&
        issues.some(i => i.field === 'epsActual' && i.type === 'MISSING_DATA'),
      action: (data) => ({
        ...data,
        epsActual: data.epsEstimate,
        _fallback_applied: 'use_estimate_as_actual_eps'
      })
    },
    
    // Revenue fallbacks
    {
      name: 'use_estimate_as_actual_revenue',
      priority: 10,
      condition: (data, issues) => 
        !data.revenueActual && data.revenueEstimate &&
        issues.some(i => i.field === 'revenueActual' && i.type === 'MISSING_DATA'),
      action: (data) => ({
        ...data,
        revenueActual: data.revenueEstimate,
        _fallback_applied: 'use_estimate_as_actual_revenue'
      })
    }
  ]

  /**
   * Aplikuje fallback strategie na data
   */
  static applyFallbacks(data: any, issues: DataQualityIssue[]): FallbackResult {
    const appliedStrategies: string[] = []
    let currentData = { ...data }
    let remainingIssues = [...issues]
    
    // Zoradiť stratégie podľa priority
    const sortedStrategies = [...this.FALLBACK_STRATEGIES].sort((a, b) => a.priority - b.priority)
    
    for (const strategy of sortedStrategies) {
      if (strategy.condition(currentData, remainingIssues)) {
        try {
          currentData = strategy.action(currentData)
          appliedStrategies.push(strategy.name)
          
          // Odstrániť vyriešené issues
          remainingIssues = remainingIssues.filter(issue => {
            // Ak je issue vyriešené fallback stratégiou, odstrániť ho
            return !this.isIssueResolved(issue, strategy.name)
          })
          
          console.log(`🔄 [FALLBACK] Applied strategy "${strategy.name}" for ${data.ticker}`)
        } catch (error) {
          console.error(`❌ [FALLBACK] Failed to apply strategy "${strategy.name}" for ${data.ticker}:`, error)
        }
      }
    }
    
    return {
      success: appliedStrategies.length > 0,
      data: currentData,
      appliedStrategies,
      remainingIssues
    }
  }

  /**
   * Kontroluje či je issue vyriešené fallback stratégiou
   */
  private static isIssueResolved(issue: DataQualityIssue, strategyName: string): boolean {
    const strategyFieldMap: Record<string, string[]> = {
      'use_previous_close_as_current': ['currentPrice'],
      'use_current_as_previous': ['previousClose'],
      'calculate_market_cap_from_price_shares': ['marketCap'],
      'estimate_shares_from_market_cap': ['sharesOutstanding'],
      'use_ticker_as_company_name': ['companyName'],
      'set_default_company_type': ['companyType'],
      'set_default_exchange': ['primaryExchange'],
      'classify_size_from_market_cap': ['size'],
      'use_estimate_as_actual_eps': ['epsActual'],
      'use_estimate_as_actual_revenue': ['revenueActual']
    }
    
    const fields = strategyFieldMap[strategyName] || []
    return fields.includes(issue.field || '')
  }

  /**
   * Aplikuje fallback pre earnings data
   */
  static applyEarningsFallbacks(data: any, issues: DataQualityIssue[]): FallbackResult {
    return this.applyFallbacks(data, issues)
  }

  /**
   * Aplikuje fallback pre market data
   */
  static applyMarketDataFallbacks(data: any, issues: DataQualityIssue[]): FallbackResult {
    return this.applyFallbacks(data, issues)
  }

  /**
   * Loguje fallback výsledky
   */
  static logFallbackResult(result: FallbackResult, ticker: string): void {
    if (result.appliedStrategies.length > 0) {
      console.log(`🔄 [FALLBACK] ${ticker}: Applied ${result.appliedStrategies.length} strategies:`, result.appliedStrategies.join(', '))
    }
    
    if (result.remainingIssues.length > 0) {
      const criticalIssues = result.remainingIssues.filter(i => i.severity === 'CRITICAL').length
      const highIssues = result.remainingIssues.filter(i => i.severity === 'HIGH').length
      
      if (criticalIssues > 0 || highIssues > 0) {
        console.warn(`⚠️ [FALLBACK] ${ticker}: ${result.remainingIssues.length} issues remain (${criticalIssues} critical, ${highIssues} high)`)
      }
    }
  }
}
