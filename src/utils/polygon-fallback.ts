/**
 * Polygon API Fallback Utility
 * 
 * Handles 404 errors from Polygon API by trying alternative endpoints
 * and gracefully degrading to null values
 */

import axios, { AxiosError } from 'axios'

const POLY = process.env.POLYGON_API_KEY!

interface PolygonTickerData {
  share_class_shares_outstanding?: number
  name?: string
  market_cap?: number
  active?: boolean
}

interface FallbackResult<T> {
  data: T | null
  source: 'direct' | 'query' | 'fallback' | 'none'
  error?: string
}

/**
 * Get ticker data with fallback chain
 * 
 * Strategy:
 * 1. Try direct endpoint: /v3/reference/tickers/{ticker}
 * 2. Try query endpoint: /v3/reference/tickers?ticker={ticker}
 * 3. Return null (graceful degradation)
 */
export async function getTickerDataWithFallback(
  ticker: string
): Promise<FallbackResult<PolygonTickerData>> {
  // Try 1: Direct endpoint (most common)
  try {
    const { data } = await axios.get(
      `https://api.polygon.io/v3/reference/tickers/${ticker}`,
      { 
        params: { apikey: POLY },
        timeout: 10000
      }
    )
    
    if (data?.results) {
      return {
        data: data.results,
        source: 'direct'
      }
    }
  } catch (err) {
    const error = err as AxiosError
    
    // Only try fallback on 404 (ticker not found)
    if (error.response?.status === 404) {
      console.log(`[FALLBACK] ${ticker}: Direct endpoint 404, trying query...`)
      
      // Try 2: Query endpoint (more forgiving for OTC/delisted tickers)
      try {
        const { data } = await axios.get(
          'https://api.polygon.io/v3/reference/tickers',
          {
            params: {
              ticker,
              active: true,
              market: 'stocks',
              apikey: POLY
            },
            timeout: 10000
          }
        )
        
        if (data?.results && data.results.length > 0) {
          console.log(`[FALLBACK] ${ticker}: Found via query endpoint`)
          return {
            data: data.results[0],
            source: 'query'
          }
        }
        
        // Try inactive tickers
        const { data: inactiveData } = await axios.get(
          'https://api.polygon.io/v3/reference/tickers',
          {
            params: {
              ticker,
              active: false,
              market: 'stocks',
              apikey: POLY
            },
            timeout: 10000
          }
        )
        
        if (inactiveData?.results && inactiveData.results.length > 0) {
          console.log(`[FALLBACK] ${ticker}: Found via query endpoint (inactive)`)
          return {
            data: inactiveData.results[0],
            source: 'query'
          }
        }
        
      } catch (err2) {
        console.warn(`[FALLBACK] ${ticker}: Query endpoint also failed`)
      }
    } else {
      // For non-404 errors (rate limit, server error), propagate
      throw err
    }
  }
  
  // All attempts failed - return null (graceful degradation)
  console.warn(`[FALLBACK] ${ticker}: All endpoints failed, using null`)
  return {
    data: null,
    source: 'none',
    error: 'Ticker not found in Polygon API'
  }
}

/**
 * Get shares outstanding with fallback
 */
export async function getSharesOutstandingWithFallback(
  ticker: string
): Promise<number | null> {
  const result = await getTickerDataWithFallback(ticker)
  
  if (result.data?.share_class_shares_outstanding) {
    return result.data.share_class_shares_outstanding
  }
  
  return null
}

/**
 * Get company name with fallback
 */
export async function getCompanyNameWithFallback(
  ticker: string
): Promise<string> {
  const result = await getTickerDataWithFallback(ticker)
  
  if (result.data?.name) {
    return result.data.name
  }
  
  // Fallback to ticker symbol
  return ticker
}

/**
 * Normalize ticker symbol
 * Handles OTC suffixes, delisting markers, etc.
 * 
 * Examples:
 * - AKTS → AKTSQ (OTC)
 * - ACCD.A → ACCD (class shares)
 */
export function normalizeTickerSymbol(ticker: string): string {
  // Remove class suffixes
  const withoutClass = ticker.replace(/\.[A-Z]$/, '')
  
  // Keep OTC suffixes (Q, F, etc.)
  return withoutClass
}

/**
 * Check if ticker is likely OTC/Pink Sheets
 */
export function isOTCTicker(ticker: string): boolean {
  // OTC tickers often end with Q, F, E, or K
  return /[QFEK]$/.test(ticker)
}

