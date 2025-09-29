/**
 * 💰 MARKET DATA MODULE - TypeScript Types
 * Definície typov pre market data domain
 */

export interface MarketData {
  ticker: string
  reportDate: Date
  companyName: string
  currentPrice?: number | null
  previousClose?: number | null
  marketCap?: bigint | null
  size?: 'Mega' | 'Large' | 'Mid' | 'Small' | null
  marketCapDiff?: number | null           // Percentage change
  marketCapDiffBillions?: number | null   // Absolute change in billions
  priceChangePercent?: number | null
  sharesOutstanding?: bigint | null
  updatedAt?: Date | null
  companyType?: 'Public' | 'Private' | null
  primaryExchange?: string | null
  reportTime?: 'BMO' | 'AMC' | 'TNS' | null
}

export interface PriceData {
  ticker: string
  currentPrice: number | null
  previousClose: number | null
  priceChange: number | null
  priceChangePercent: number | null
  volume?: number | null
  high?: number | null
  low?: number | null
  open?: number | null
}

export interface MarketCapData {
  ticker: string
  marketCap: bigint | null
  marketCapDiff: number | null           // Percentage
  marketCapDiffBillions: number | null   // Absolute in billions
  sharesOutstanding: bigint | null
  size: 'Mega' | 'Large' | 'Mid' | 'Small' | null
}

export interface CompanyProfile {
  ticker: string
  companyName: string
  sector?: string | null
  industry?: string | null
  marketCap?: bigint | null
  sharesOutstanding?: bigint | null
  primaryExchange?: string | null
  companyType: 'Public' | 'Private'
  description?: string | null
  website?: string | null
}

// API Response Types
export interface PolygonPrevCloseResponse {
  results: Array<{
    c: number      // Close price
    h: number      // High
    l: number      // Low  
    o: number      // Open
    v: number      // Volume
    vw: number     // Volume weighted average price
    t: number      // Timestamp
    n: number      // Number of transactions
  }>
  status: string
}

export interface PolygonSnapshotResponse {
  ticker: {
    day: {
      c: number      // Current/close price
      h: number      // High
      l: number      // Low
      o: number      // Open
      v: number      // Volume
    }
    todaysChangePerc: number
    updated: number
  }
  status: string
}

export interface PolygonTickerDetailsResponse {
  results: {
    name: string
    market_cap: number
    share_class_shares_outstanding: number
    weighted_shares_outstanding: number
    primary_exchange: string
    type: string
    description: string
    homepage_url: string
    sic_description: string
    ticker: string
  }
  status: string
}

// Input Types
export interface CreateMarketDataInput {
  ticker: string
  reportDate: Date
  companyName: string
  currentPrice?: number
  previousClose?: number
  marketCap?: bigint
  size?: string
  marketCapDiff?: number
  marketCapDiffBillions?: number
  priceChangePercent?: number
  sharesOutstanding?: bigint
  companyType?: string
  primaryExchange?: string
  reportTime?: string
}

export interface UpdateMarketDataInput extends Partial<CreateMarketDataInput> {
  ticker: string
  reportDate: Date
}

export interface MarketDataFilters {
  reportDate?: Date
  tickers?: string[]
  sizes?: Array<'Mega' | 'Large' | 'Mid' | 'Small'>
  exchanges?: string[]
  hasCurrentPrice?: boolean
  hasPriceChange?: boolean
  minMarketCap?: number
  maxMarketCap?: number
  priceChangeMin?: number
  priceChangeMax?: number
}

// Calculation Input Types
export interface MarketCapCalculationInput {
  currentPrice: number | null
  previousClose: number | null
  sharesOutstanding: bigint | null
  ticker: string
}

export interface ValidatedMarketCapInput {
  currentPrice: number
  previousClose: number
  sharesOutstanding: bigint
  ticker: string
}

export interface MarketCapCalculationResult {
  marketCap: bigint | null
  marketCapDiff: number | null
  marketCapDiffBillions: number | null
  size: 'Mega' | 'Large' | 'Mid' | 'Small' | null
  priceChangePercent: number | null
  isValid: boolean
  validationErrors: string[]
}

// Size Categories (in billions) - unified thresholds
export const MARKET_CAP_THRESHOLDS = {
  MEGA: 100_000_000_000,   // $100B+
  LARGE: 10_000_000_000,   // $10B - $100B  
  MID: 2_000_000_000,      // $2B - $10B
  SMALL: 0                 // < $2B
} as const

// Market Status
export interface MarketStatus {
  isOpen: boolean
  nextOpenTime: Date | null
  nextCloseTime: Date | null
  timezone: string
}

// Top Performers
export interface TopPerformer {
  ticker: string
  companyName: string
  priceChangePercent: number
  marketCapDiffBillions: number
  currentPrice: number | null
  size: string | null
}

export interface TopPerformersResult {
  topGainers: TopPerformer[]
  topLosers: TopPerformer[]
  biggestCapIncreases: TopPerformer[]
  biggestCapDecreases: TopPerformer[]
}
