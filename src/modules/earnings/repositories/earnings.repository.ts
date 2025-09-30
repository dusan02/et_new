/**
 * 📊 EARNINGS MODULE - Repository Layer
 * Database operations pre earnings data
 */

import { prisma } from '@/lib/prisma'
import { 
  EarningsData, 
  CreateEarningsInput, 
  UpdateEarningsInput, 
  EarningsFilters,
  EarningsQueryResult 
} from '../types'
import { calculateEarningsSurprise } from '../utils'

export class EarningsRepository {
  /**
   * Helper function to transform Prisma data to EarningsData
   */
  private transformToEarningsData(data: any[]): EarningsData[] {
    return this.transformToEarningsData(data)
  }
  /**
   * Find earnings by date
   * @param reportDate - Report date
   * @returns Array of earnings data
   */
  async findByDate(reportDate: Date): Promise<EarningsData[]> {
    const data = await prisma.earningsTickersToday.findMany({
      where: { reportDate },
      orderBy: { ticker: 'asc' }
    })
    
    return this.transformToEarningsData(data)
  }

  /**
   * Find earnings by ticker
   * @param ticker - Stock ticker
   * @returns Array of earnings data
   */
  async findByTicker(ticker: string): Promise<EarningsData[]> {
    const data = await prisma.earningsTickersToday.findMany({
      where: { ticker },
      orderBy: { reportDate: 'desc' }
    })
    
    return this.transformToEarningsData(data)
  }

  /**
   * Find earnings with filters
   * @param filters - EarningsFilters object
   * @returns Array of earnings data
   */
  async findWithFilters(filters: EarningsFilters): Promise<EarningsData[]> {
    const where: any = {}

    if (filters.reportDate) {
      where.reportDate = filters.reportDate
    }

    if (filters.tickers && filters.tickers.length > 0) {
      where.ticker = { in: filters.tickers }
    }

    if (filters.sectors && filters.sectors.length > 0) {
      where.sector = { in: filters.sectors }
    }

    if (filters.reportTime && filters.reportTime.length > 0) {
      where.reportTime = { in: filters.reportTime }
    }

    if (filters.fiscalPeriod && filters.fiscalPeriod.length > 0) {
      where.fiscalPeriod = { in: filters.fiscalPeriod }
    }

    if (filters.fiscalYear && filters.fiscalYear.length > 0) {
      where.fiscalYear = { in: filters.fiscalYear }
    }

    if (filters.hasActuals !== undefined) {
      if (filters.hasActuals) {
        where.OR = [
          { epsActual: { not: null } },
          { revenueActual: { not: null } }
        ]
      } else {
        where.AND = [
          { epsActual: null },
          { revenueActual: null }
        ]
      }
    }

    if (filters.hasEstimates !== undefined) {
      if (filters.hasEstimates) {
        where.OR = [
          { epsEstimate: { not: null } },
          { revenueEstimate: { not: null } }
        ]
      } else {
        where.AND = [
          { epsEstimate: null },
          { revenueEstimate: null }
        ]
      }
    }

    return await prisma.earningsTickersToday.findMany({
      where,
      orderBy: [
        { reportDate: 'desc' },
        { ticker: 'asc' }
      ]
    })
  }

  /**
   * Find earnings with surprise calculations
   * @param reportDate - Report date
   * @returns Array of earnings with calculated surprises
   */
  async findWithSurprises(reportDate: Date): Promise<EarningsQueryResult[]> {
    const earnings = await this.findByDate(reportDate)
    
    return earnings.map(earning => {
      const surprise = calculateEarningsSurprise(
        earning.epsActual,
        earning.epsEstimate,
        earning.revenueActual,
        earning.revenueEstimate
      )
      
      return {
        ...earning,
        epsSurprise: surprise.epsSurprise,
        revenueSurprise: surprise.revenueSurprise
      }
    })
  }

  /**
   * Create or update earnings data
   * @param data - CreateEarningsInput data
   * @returns Created/updated earnings data
   */
  async upsert(data: CreateEarningsInput): Promise<EarningsData> {
    return await prisma.earningsTickersToday.upsert({
      where: {
        reportDate_ticker: {
          reportDate: data.reportDate,
          ticker: data.ticker
        }
      },
      update: {
        reportTime: data.reportTime || undefined,
        epsActual: data.epsActual || undefined,
        epsEstimate: data.epsEstimate || undefined,
        revenueActual: data.revenueActual || undefined,
        revenueEstimate: data.revenueEstimate || undefined,
        sector: data.sector || undefined,
        fiscalPeriod: data.fiscalPeriod || undefined,
        fiscalYear: data.fiscalYear || undefined,
        dataSource: data.dataSource || undefined,
        updatedAt: new Date()
      },
      create: {
        reportDate: data.reportDate,
        ticker: data.ticker,
        reportTime: data.reportTime || undefined,
        epsActual: data.epsActual || undefined,
        epsEstimate: data.epsEstimate || undefined,
        revenueActual: data.revenueActual || undefined,
        revenueEstimate: data.revenueEstimate || undefined,
        sector: data.sector || undefined,
        fiscalPeriod: data.fiscalPeriod || undefined,
        fiscalYear: data.fiscalYear || undefined,
        dataSource: data.dataSource || undefined,
        companyType: 'Public',
        sourcePriority: 1
      }
    })
  }

  /**
   * Batch upsert earnings data
   * @param dataArray - Array of earnings data
   * @returns Number of processed records
   */
  async batchUpsert(dataArray: CreateEarningsInput[]): Promise<number> {
    let processedCount = 0
    
    for (const data of dataArray) {
      try {
        await this.upsert(data)
        processedCount++
      } catch (error) {
        console.error(`Failed to upsert earnings for ${data.ticker}:`, error)
      }
    }
    
    return processedCount
  }

  /**
   * Update earnings data
   * @param data - UpdateEarningsInput data
   * @returns Updated earnings data or null
   */
  async update(data: UpdateEarningsInput): Promise<EarningsData | null> {
    try {
      return await prisma.earningsTickersToday.update({
        where: {
          reportDate_ticker: {
            reportDate: data.reportDate,
            ticker: data.ticker
          }
        },
        data: {
          ...data,
          updatedAt: new Date()
        }
      })
    } catch (error) {
      console.error(`Failed to update earnings for ${data.ticker}:`, error)
      return null
    }
  }

  /**
   * Delete earnings by date and ticker
   * @param reportDate - Report date
   * @param ticker - Stock ticker
   * @returns True if deleted
   */
  async delete(reportDate: Date, ticker: string): Promise<boolean> {
    try {
      await prisma.earningsTickersToday.delete({
        where: {
          reportDate_ticker: {
            reportDate,
            ticker
          }
        }
      })
      return true
    } catch (error) {
      console.error(`Failed to delete earnings for ${ticker}:`, error)
      return false
    }
  }

  /**
   * Get unique sectors
   * @returns Array of unique sectors
   */
  async getUniqueSectors(): Promise<string[]> {
    const result = await prisma.earningsTickersToday.findMany({
      select: { sector: true },
      where: { sector: { not: null } },
      distinct: ['sector']
    })
    
    return result
      .map(r => r.sector)
      .filter(Boolean) as string[]
  }

  /**
   * Get unique fiscal periods
   * @returns Array of unique fiscal periods
   */
  async getUniqueFiscalPeriods(): Promise<string[]> {
    const result = await prisma.earningsTickersToday.findMany({
      select: { fiscalPeriod: true },
      where: { fiscalPeriod: { not: null } },
      distinct: ['fiscalPeriod']
    })
    
    return result
      .map(r => r.fiscalPeriod)
      .filter(Boolean) as string[]
  }

  /**
   * Count earnings by filters
   * @param filters - EarningsFilters object
   * @returns Count of matching records
   */
  async count(filters: EarningsFilters = {}): Promise<number> {
    const where: any = {}

    if (filters.reportDate) {
      where.reportDate = filters.reportDate
    }

    if (filters.tickers && filters.tickers.length > 0) {
      where.ticker = { in: filters.tickers }
    }

    return await prisma.earningsTickersToday.count({ where })
  }
}
