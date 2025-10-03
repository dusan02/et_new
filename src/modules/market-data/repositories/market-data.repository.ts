/**
 * 💰 MARKET DATA MODULE - Repository Layer  
 * Database operations pre market data
 */

import { prisma } from '@/lib/prisma'
import { 
  MarketData,
  CreateMarketDataInput,
  UpdateMarketDataInput,
  MarketDataFilters,
  TopPerformersResult,
  TopPerformer
} from '../types'

export class MarketDataRepository {
  /**
   * Find market data by date
   * @param reportDate - Report date
   * @returns Array of market data
   */
  async findByDate(reportDate: Date): Promise<MarketData[]> {
    return await prisma.todayEarningsMovements.findMany({
      where: { reportDate },
      orderBy: { ticker: 'asc' }
    })
  }

  /**
   * Find market data by ticker
   * @param ticker - Stock ticker
   * @returns Array of market data
   */
  async findByTicker(ticker: string): Promise<MarketData[]> {
    return await prisma.todayEarningsMovements.findMany({
      where: { ticker },
      orderBy: { reportDate: 'desc' }
    })
  }

  /**
   * Find market data with filters
   * @param filters - MarketDataFilters object
   * @returns Array of market data
   */
  async findWithFilters(filters: MarketDataFilters): Promise<MarketData[]> {
    const where: any = {}

    if (filters.reportDate) {
      where.reportDate = filters.reportDate
    }

    if (filters.tickers && filters.tickers.length > 0) {
      where.ticker = { in: filters.tickers }
    }

    if (filters.sizes && filters.sizes.length > 0) {
      where.size = { in: filters.sizes }
    }

    if (filters.exchanges && filters.exchanges.length > 0) {
      where.primaryExchange = { in: filters.exchanges }
    }

    if (filters.hasCurrentPrice !== undefined) {
      where.currentPrice = filters.hasCurrentPrice 
        ? { not: null }
        : null
    }

    if (filters.hasPriceChange !== undefined) {
      where.priceChangePercent = filters.hasPriceChange
        ? { not: null }
        : null
    }

    if (filters.minMarketCap !== undefined) {
      where.marketCap = {
        ...where.marketCap,
        gte: BigInt(filters.minMarketCap)
      }
    }

    if (filters.maxMarketCap !== undefined) {
      where.marketCap = {
        ...where.marketCap,
        lte: BigInt(filters.maxMarketCap)
      }
    }

    if (filters.priceChangeMin !== undefined) {
      where.priceChangePercent = {
        ...where.priceChangePercent,
        gte: filters.priceChangeMin
      }
    }

    if (filters.priceChangeMax !== undefined) {
      where.priceChangePercent = {
        ...where.priceChangePercent,
        lte: filters.priceChangeMax
      }
    }

    return await prisma.todayEarningsMovements.findMany({
      where,
      orderBy: [
        { reportDate: 'desc' },
        { ticker: 'asc' }
      ]
    })
  }

  /**
   * Get top performers for a specific date
   * @param reportDate - Report date
   * @param limit - Number of results per category
   * @returns TopPerformersResult
   */
  async getTopPerformers(
    reportDate: Date, 
    limit: number = 5
  ): Promise<TopPerformersResult> {
    // Get all market data for the date with required fields
    const marketData = await prisma.todayEarningsMovements.findMany({
      where: { 
        reportDate,
        AND: [
          { priceChangePercent: { not: null } },
          { currentPrice: { not: null } },
          { marketCapDiffBillions: { not: null } }
        ]
      },
      select: {
        ticker: true,
        companyName: true,
        priceChangePercent: true,
        marketCapDiffBillions: true,
        currentPrice: true,
        size: true
      },
      orderBy: { ticker: 'asc' }
    })

    // Convert to TopPerformer format
    const performers: TopPerformer[] = marketData.map(item => ({
      ticker: item.ticker,
      companyName: item.companyName,
      priceChangePercent: item.priceChangePercent!,
      marketCapDiffBillions: item.marketCapDiffBillions!,
      currentPrice: item.currentPrice,
      size: item.size
    }))

    // Sort and get top gainers/losers
    const topGainers = [...performers]
      .sort((a, b) => b.priceChangePercent - a.priceChangePercent)
      .slice(0, limit)

    const topLosers = [...performers]
      .sort((a, b) => a.priceChangePercent - b.priceChangePercent)
      .slice(0, limit)

    const biggestCapIncreases = [...performers]
      .sort((a, b) => b.marketCapDiffBillions - a.marketCapDiffBillions)
      .slice(0, limit)

    const biggestCapDecreases = [...performers]
      .sort((a, b) => a.marketCapDiffBillions - b.marketCapDiffBillions)
      .slice(0, limit)

    return {
      topGainers,
      topLosers,
      biggestCapIncreases,
      biggestCapDecreases
    }
  }

  /**
   * Create or update market data
   * @param data - CreateMarketDataInput data
   * @returns Created/updated market data
   */
  async upsert(data: CreateMarketDataInput): Promise<MarketData> {
    return await prisma.todayEarningsMovements.upsert({
      where: {
        ticker_reportDate: {
          ticker: data.ticker,
          reportDate: data.reportDate
        }
      },
      update: {
        companyName: data.companyName,
        currentPrice: data.currentPrice !== null && data.currentPrice !== undefined ? data.currentPrice : undefined,
        previousClose: data.previousClose !== null && data.previousClose !== undefined ? data.previousClose : undefined,
        marketCap: data.marketCap || undefined,
        size: data.size || undefined,
        marketCapDiff: data.marketCapDiff !== null && data.marketCapDiff !== undefined ? data.marketCapDiff : undefined,
        marketCapDiffBillions: data.marketCapDiffBillions !== null && data.marketCapDiffBillions !== undefined ? data.marketCapDiffBillions : undefined,
        priceChangePercent: data.priceChangePercent ?? null,
        sharesOutstanding: data.sharesOutstanding || undefined,
        companyType: data.companyType || undefined,
        primaryExchange: data.primaryExchange || undefined,
        reportTime: data.reportTime || undefined,
        updatedAt: new Date()
      },
      create: {
        ticker: data.ticker,
        reportDate: data.reportDate,
        companyName: data.companyName,
        currentPrice: data.currentPrice !== null && data.currentPrice !== undefined ? data.currentPrice : undefined,
        previousClose: data.previousClose !== null && data.previousClose !== undefined ? data.previousClose : undefined,
        marketCap: data.marketCap || undefined,
        size: data.size || undefined,
        marketCapDiff: data.marketCapDiff !== null && data.marketCapDiff !== undefined ? data.marketCapDiff : undefined,
        marketCapDiffBillions: data.marketCapDiffBillions !== null && data.marketCapDiffBillions !== undefined ? data.marketCapDiffBillions : undefined,
        priceChangePercent: data.priceChangePercent ?? null,
        sharesOutstanding: data.sharesOutstanding || undefined,
        companyType: data.companyType || 'Public',
        primaryExchange: data.primaryExchange || undefined,
        reportTime: data.reportTime || undefined,
        updatedAt: new Date()
      }
    })
  }

  /**
   * Batch upsert market data
   * @param dataArray - Array of market data
   * @returns Number of processed records
   */
  async batchUpsert(dataArray: CreateMarketDataInput[]): Promise<number> {
    let processedCount = 0
    
    for (const data of dataArray) {
      try {
        await this.upsert(data)
        processedCount++
      } catch (error) {
        console.error(`Failed to upsert market data for ${data.ticker}:`, error)
      }
    }
    
    return processedCount
  }

  /**
   * Update market data
   * @param data - UpdateMarketDataInput data
   * @returns Updated market data or null
   */
  async update(data: UpdateMarketDataInput): Promise<MarketData | null> {
    try {
      return await prisma.todayEarningsMovements.update({
        where: {
          ticker_reportDate: {
            ticker: data.ticker,
            reportDate: data.reportDate
          }
        },
        data: {
          ...data,
          updatedAt: new Date()
        }
      })
    } catch (error) {
      console.error(`Failed to update market data for ${data.ticker}:`, error)
      return null
    }
  }

  /**
   * Delete market data by date and ticker
   * @param reportDate - Report date
   * @param ticker - Stock ticker
   * @returns True if deleted
   */
  async delete(reportDate: Date, ticker: string): Promise<boolean> {
    try {
      await prisma.todayEarningsMovements.delete({
        where: {
          ticker_reportDate: {
            ticker,
            reportDate
          }
        }
      })
      return true
    } catch (error) {
      console.error(`Failed to delete market data for ${ticker}:`, error)
      return false
    }
  }

  /**
   * Get unique company sizes
   * @returns Array of unique sizes
   */
  async getUniqueSizes(): Promise<string[]> {
    const result = await prisma.todayEarningsMovements.findMany({
      select: { size: true },
      where: { size: { not: null } },
      distinct: ['size']
    })
    
    return result
      .map(r => r.size)
      .filter(Boolean) as string[]
  }

  /**
   * Get unique exchanges
   * @returns Array of unique exchanges
   */
  async getUniqueExchanges(): Promise<string[]> {
    const result = await prisma.todayEarningsMovements.findMany({
      select: { primaryExchange: true },
      where: { primaryExchange: { not: null } },
      distinct: ['primaryExchange']
    })
    
    return result
      .map(r => r.primaryExchange)
      .filter(Boolean) as string[]
  }

  /**
   * Count market data by filters
   * @param filters - MarketDataFilters object
   * @returns Count of matching records
   */
  async count(filters: MarketDataFilters = {}): Promise<number> {
    const where: any = {}

    if (filters.reportDate) {
      where.reportDate = filters.reportDate
    }

    if (filters.tickers && filters.tickers.length > 0) {
      where.ticker = { in: filters.tickers }
    }

    return await prisma.todayEarningsMovements.count({ where })
  }

  /**
   * Get market data statistics for a date
   * @param reportDate - Report date
   * @returns Statistics object
   */
  async getStatistics(reportDate: Date): Promise<{
    totalCompanies: number
    withCurrentPrice: number
    withPriceChange: number
    avgPriceChange: number | null
    totalMarketCapChange: number | null
  }> {
    const data = await prisma.todayEarningsMovements.findMany({
      where: { reportDate },
      select: {
        currentPrice: true,
        priceChangePercent: true,
        marketCapDiffBillions: true
      }
    })

    const totalCompanies = data.length
    const withCurrentPrice = data.filter(d => d.currentPrice !== null).length
    const withPriceChange = data.filter(d => d.priceChangePercent !== null).length
    
    const priceChanges = data
      .map(d => d.priceChangePercent)
      .filter(p => p !== null) as number[]
    
    const avgPriceChange = priceChanges.length > 0
      ? priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length
      : null

    const marketCapChanges = data
      .map(d => d.marketCapDiffBillions)
      .filter(m => m !== null) as number[]
    
    const totalMarketCapChange = marketCapChanges.length > 0
      ? marketCapChanges.reduce((sum, change) => sum + change, 0)
      : null

    return {
      totalCompanies,
      withCurrentPrice,
      withPriceChange,
      avgPriceChange,
      totalMarketCapChange
    }
  }
}
