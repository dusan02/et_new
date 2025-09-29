/**
 * 📊 EARNINGS MODULE - TypeScript Types
 * Definície typov pre earnings domain
 */

export interface EarningsData {
  reportDate: Date
  ticker: string
  reportTime?: 'BMO' | 'AMC' | 'TNS' | null
  epsActual?: number | null
  epsEstimate?: number | null
  revenueActual?: bigint | null
  revenueEstimate?: bigint | null
  sector?: string | null
  companyType?: 'Public' | 'Private' | null
  dataSource?: 'finnhub' | 'polygon' | 'benzinga' | null
  sourcePriority?: number | null
  fiscalPeriod?: string | null // Q1, Q2, Q3, Q4, FY, H1, H2
  fiscalYear?: number | null
  primaryExchange?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface EarningsSurprise {
  ticker: string
  epsSurprise: number | null      // Percentage: (actual - estimate) / |estimate| * 100
  revenueSurprise: number | null  // Percentage: (actual - estimate) / |estimate| * 100
  hasEpsData: boolean
  hasRevenueData: boolean
}

export interface FiscalPeriodInfo {
  period: string    // Q1, Q2, Q3, Q4, FY, H1, H2
  year: number
  isQuarter: boolean
  isAnnual: boolean
  isSemiAnnual: boolean
}

export interface EarningsCalendarEntry {
  ticker: string
  reportDate: Date
  reportTime: 'BMO' | 'AMC' | 'TNS' | null
  fiscalPeriod: string | null
  fiscalYear: number | null
  hasEstimates: boolean
  hasActuals: boolean
}

export interface EarningsStats {
  totalCompanies: number
  withEpsActual: number
  withRevenueActual: number
  withBothActual: number
  withoutAnyActual: number
  avgEpsSurprise: number | null
  avgRevenueSurprise: number | null
  positiveEpsSurprises: number
  negativeEpsSurprises: number
  positiveRevenueSurprises: number
  negativeRevenueSurprises: number
}

// API types
export interface FinnhubEarningsResponse {
  earningsCalendar: Array<{
    date: string
    epsActual: number | null
    epsEstimate: number | null
    hour: string
    quarter: number
    revenueActual: number | null
    revenueEstimate: number | null
    symbol: string
    year: number
  }>
}

export interface CreateEarningsInput {
  reportDate: Date
  ticker: string
  reportTime?: 'BMO' | 'AMC' | 'TNS'
  epsActual?: number
  epsEstimate?: number
  revenueActual?: bigint
  revenueEstimate?: bigint
  sector?: string
  fiscalPeriod?: string
  fiscalYear?: number
  dataSource?: string
}

export interface UpdateEarningsInput extends Partial<CreateEarningsInput> {
  reportDate: Date
  ticker: string
}

export interface EarningsFilters {
  reportDate?: Date
  tickers?: string[]
  sectors?: string[]
  reportTime?: Array<'BMO' | 'AMC' | 'TNS'>
  hasActuals?: boolean
  hasEstimates?: boolean
  fiscalPeriod?: string[]
  fiscalYear?: number[]
}

export interface EarningsQueryResult extends EarningsData {
  epsSurprise: number | null
  revenueSurprise: number | null
}
