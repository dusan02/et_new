import { NextResponse } from 'next/server'
import { z } from 'zod'

// Data validation schemas
const MarketDataSchema = z.object({
  currentPrice: z.number().positive().nullable(),
  previousClose: z.number().positive().nullable(),
  priceChangePercent: z.number().finite().nullable(),
  marketCap: z.number().nonnegative().nullable(),
  companyName: z.string().nullable(),
  marketCapDiffBillions: z.number().nullable(),
})

const EarningSchema = z.object({
  ticker: z.string().min(1),
  revenueActual: z.number().int().nonnegative().nullable(),
  revenueEstimate: z.number().int().nonnegative().nullable(),
  epsActual: z.number().nullable(),
  epsEstimate: z.number().nullable(),
  reportTime: z.string().nullable(),
  marketData: MarketDataSchema.optional(),
})

// Sanity check function
function sanitizeEarningsData(item: any) {
  // Revenue sanity check (< 1T = 1e12)
  if (item.revenueActual && item.revenueActual > 1e12) {
    console.warn(`[SANITY] Revenue actual too high for ${item.ticker}: ${item.revenueActual}, setting to null`)
    item.revenueActual = null
  }
  if (item.revenueEstimate && item.revenueEstimate > 1e12) {
    console.warn(`[SANITY] Revenue estimate too high for ${item.ticker}: ${item.revenueEstimate}, setting to null`)
    item.revenueEstimate = null
  }

  // Price change percent recompute if both prices present
  if (item.marketData?.currentPrice != null && item.marketData?.previousClose && item.marketData.previousClose > 0) {
    const calculatedPercent = ((item.marketData.currentPrice - item.marketData.previousClose) / item.marketData.previousClose) * 100
    item.marketData.priceChangePercent = Number(calculatedPercent.toFixed(6))
  }

  // Price change percent sanity check
  if (item.marketData?.priceChangePercent && Math.abs(item.marketData.priceChangePercent) > 50) {
    console.warn(`[SANITY] Extreme price change for ${item.ticker}: ${item.marketData.priceChangePercent}%, setting to null`)
    item.marketData.priceChangePercent = null
  }

  return item
}

// Fallback data storage (in production, use Redis)
let lastSuccessfulSnapshot: any = null;
let lastSnapshotTimestamp: Date | null = null;

// Fallback feature flag
function shouldUseFallback(): boolean {
  return process.env.EARNINGS_FALLBACK === '1';
}

// Store successful snapshot for fallback
function storeSuccessfulSnapshot(data: any) {
  lastSuccessfulSnapshot = data;
  lastSnapshotTimestamp = new Date();
  console.log(`[FALLBACK] Stored successful snapshot at ${lastSnapshotTimestamp.toISOString()}`);
}

// Get fallback data
function getFallbackData() {
  if (!lastSuccessfulSnapshot || !lastSnapshotTimestamp) {
    return null;
  }
  
  const ageMinutes = (Date.now() - lastSnapshotTimestamp.getTime()) / (1000 * 60);
  console.log(`[FALLBACK] Using stale data from ${ageMinutes.toFixed(1)} minutes ago`);
  
  return {
    ...lastSuccessfulSnapshot,
    meta: {
      ...lastSuccessfulSnapshot.meta,
      note: 'stale-fallback',
      lastFresh: lastSnapshotTimestamp.toISOString()
    }
  };
}

// Default stats structure for fallback
export const defaultStats = {
  totalEarnings: 0,
  withEps: 0,
  withRevenue: 0,
  sizeDistribution: [
    { size: 'Mega', _count: { size: 0 }, _sum: { marketCap: 0 } },
    { size: 'Large', _count: { size: 0 }, _sum: { marketCap: 0 } },
    { size: 'Mid', _count: { size: 0 }, _sum: { marketCap: 0 } },
    { size: 'Small', _count: { size: 0 }, _sum: { marketCap: 0 } }
  ],
  topGainers: [],
  topLosers: [],
  epsBeat: null,
  revenueBeat: null,
  epsMiss: null,
  revenueMiss: null
}

// Mock data for development
const mockData = [
  {
    ticker: 'AAPL',
    companyName: 'Apple Inc.',
    reportTime: 'BMO',
    epsActual: 1.52,
    epsEstimate: 1.50,
    revenueActual: 123000000000,
    revenueEstimate: 120000000000,
    priceChangePercent: 2.5,
    marketCap: 3000000000000,
    marketCapDiffBillions: 75.0
  },
  {
    ticker: 'MSFT',
    companyName: 'Microsoft Corporation',
    reportTime: 'AMC',
    epsActual: 2.93,
    epsEstimate: 2.85,
    revenueActual: 62000000000,
    revenueEstimate: 61000000000,
    priceChangePercent: -1.2,
    marketCap: 2800000000000,
    marketCapDiffBillions: -33.6
  }
]

const mockStats = {
  totalEarnings: mockData.length,
  withEps: mockData.filter(item => item.epsActual !== null).length,
  withRevenue: mockData.filter(item => item.revenueActual !== null).length,
  sizeDistribution: [
    { size: 'Mega', _count: { size: 2 }, _sum: { marketCap: 5800000000000 } },
    { size: 'Large', _count: { size: 0 }, _sum: { marketCap: 0 } },
    { size: 'Mid', _count: { size: 0 }, _sum: { marketCap: 0 } },
    { size: 'Small', _count: { size: 0 }, _sum: { marketCap: 0 } }
  ],
  topGainers: mockData
    .filter(item => item.priceChangePercent !== null)
    .sort((a, b) => (b.priceChangePercent || 0) - (a.priceChangePercent || 0))
    .slice(0, 3),
  topLosers: mockData
    .filter(item => item.priceChangePercent !== null)
    .sort((a, b) => (a.priceChangePercent || 0) - (b.priceChangePercent || 0))
    .slice(0, 3),
  epsBeat: mockData.find(item => item.epsActual > item.epsEstimate) || null,
  revenueBeat: mockData.find(item => item.revenueActual > item.revenueEstimate) || null,
  epsMiss: mockData.find(item => item.epsActual < item.epsEstimate) || null,
  revenueMiss: mockData.find(item => item.revenueActual < item.revenueEstimate) || null
}

// Unified earnings builder - single source of truth
export async function buildLiveOrMockEarnings() {
  // Check fallback flag first
  if (shouldUseFallback()) {
    console.log('[BUILDER][FALLBACK] Fallback mode enabled, checking for stale data...')
    const fallbackData = getFallbackData()
    if (fallbackData) {
      console.log('[BUILDER][FALLBACK] Using stale fallback data')
      return fallbackData
    } else {
      console.log('[BUILDER][FALLBACK] No fallback data available, proceeding with normal flow')
    }
  }
  
  const USE_MOCK = process.env.USE_MOCK_EARNINGS === '1'
  
  console.log(`[BUILDER] USE_MOCK_EARNINGS=${process.env.USE_MOCK_EARNINGS}, USE_MOCK=${USE_MOCK}`)

  if (USE_MOCK) {
    console.log(`[BUILDER][MOCK] count=${mockData.length} sample=[${mockData.slice(0, 2).map(r => r.ticker).join(', ')}]`)
    
    const mockResult = {
      data: mockData,
      meta: {
        total: mockData.length,
        ready: mockData.length > 0,
        date: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString(),
        stats: mockStats
      }
    }
    storeSuccessfulSnapshot(mockResult)
    return mockResult
  }

  // Live branch - read from database
  console.log('[BUILDER][LIVE] Fetching live data from database')
  
  try {
    console.log('[BUILDER][LIVE] Importing Prisma...')
    const { prisma } = await import('@/lib/prisma')
    console.log('[BUILDER][LIVE] Prisma imported successfully')
    
    // Use UTC timezone to match database dates
    const today = new Date()
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1))
    
    const rawData = await prisma.earningsTickersToday.findMany({
      where: {
        reportDate: {
          gte: start,
          lte: end
        }
      },
      select: {
        ticker: true,
        reportTime: true,
        epsActual: true,
        epsEstimate: true,
        revenueActual: true,
        revenueEstimate: true,
        marketData: true
      },
      take: 500
    })
    
    // Transform data to match expected format
    const liveData = rawData.map(item => {
      const transformed = {
        ticker: item.ticker,
        companyName: (item.marketData as any)?.companyName || item.ticker,
        reportTime: item.reportTime,
        epsActual: item.epsActual,
        epsEstimate: item.epsEstimate,
        revenueActual: item.revenueActual ? Number(item.revenueActual) : null,
        revenueEstimate: item.revenueEstimate ? Number(item.revenueEstimate) : null,
        currentPrice: (item.marketData as any)?.currentPrice || null,
        previousClose: (item.marketData as any)?.previousClose || null,
        priceChangePercent: (item.marketData as any)?.priceChangePercent || null,
        marketCap: (item.marketData as any)?.marketCap || null,
        marketCapDiffBillions: (item.marketData as any)?.marketCapDiffBillions || null
      }
      
      // Apply sanity checks
      return sanitizeEarningsData(transformed)
    })
    
    console.log(`[BUILDER][LIVE] Found ${liveData.length} records in database`)
    
    // Health monitoring - log top revenue and price changes
    const revenueMax = liveData
      .filter(item => item.revenueActual)
      .sort((a, b) => (b.revenueActual || 0) - (a.revenueActual || 0))
      .slice(0, 3)
    
    const priceChangeMax = liveData
      .filter(item => item.priceChangePercent)
      .sort((a, b) => Math.abs(b.priceChangePercent || 0) - Math.abs(a.priceChangePercent || 0))
      .slice(0, 3)
    
    if (revenueMax.length > 0) {
      console.log(`[HEALTH] revenueMax=[${revenueMax.map(r => `${r.ticker}:${r.revenueActual}`).join(', ')}]`)
    }
    if (priceChangeMax.length > 0) {
      console.log(`[HEALTH] priceChangeMax=[${priceChangeMax.map(p => `${p.ticker}:${p.priceChangePercent?.toFixed(2)}%`).join(', ')}]`)
    }
    
    if (liveData.length === 0) {
      console.log('[BUILDER][LIVE] No live data found, falling back to mock')
      return {
        data: mockData,
        meta: {
          total: mockData.length,
          ready: mockData.length > 0,
          date: new Date().toISOString().split('T')[0],
          lastUpdated: new Date().toISOString(),
          stats: mockStats
        }
      }
    }
    
    // Calculate live stats
    const liveStats = {
      totalEarnings: liveData.length,
      withEps: liveData.filter(item => item.epsActual !== null).length,
      withRevenue: liveData.filter(item => item.revenueActual !== null).length,
      sizeDistribution: [
        { size: 'Mega', _count: { size: 0 }, _sum: { marketCap: 0 } },
        { size: 'Large', _count: { size: 0 }, _sum: { marketCap: 0 } },
        { size: 'Mid', _count: { size: 0 }, _sum: { marketCap: 0 } },
        { size: 'Small', _count: { size: liveData.length }, _sum: { marketCap: liveData.reduce((sum, item) => sum + (item.marketCap || 0), 0) } }
      ],
      topGainers: liveData
        .filter(item => item.priceChangePercent !== null)
        .sort((a, b) => (b.priceChangePercent || 0) - (a.priceChangePercent || 0))
        .slice(0, 3),
      topLosers: liveData
        .filter(item => item.priceChangePercent !== null)
        .sort((a, b) => (a.priceChangePercent || 0) - (b.priceChangePercent || 0))
        .slice(0, 3),
      epsBeat: liveData.find(item => item.epsActual !== null && item.epsEstimate !== null && item.epsActual > item.epsEstimate) || null,
      revenueBeat: liveData.find(item => item.revenueActual !== null && item.revenueEstimate !== null && Number(item.revenueActual) > Number(item.revenueEstimate)) || null,
      epsMiss: liveData.find(item => item.epsActual !== null && item.epsEstimate !== null && item.epsActual < item.epsEstimate) || null,
      revenueMiss: liveData.find(item => item.revenueActual !== null && item.revenueEstimate !== null && Number(item.revenueActual) < Number(item.revenueEstimate)) || null
    }
    
    const liveResult = {
      data: liveData,
      meta: {
        total: liveData.length,
        ready: liveData.length > 0,
        date: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString(),
        stats: liveStats
      }
    }
    storeSuccessfulSnapshot(liveResult)
    return liveResult
    
  } catch (error) {
    console.error('[BUILDER][LIVE] Error fetching live data:', error)
    console.log('[BUILDER][LIVE] Falling back to mock data')
    
    return {
      data: mockData,
      meta: {
        total: mockData.length,
        ready: mockData.length > 0,
        date: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString(),
        stats: mockStats
      }
    }
  }
}

// Error-safe wrapper
export async function buildEarningsWithFallback() {
  try {
    return await buildLiveOrMockEarnings()
  } catch (error) {
    console.error('[BUILDER] Error:', error)
    
    return {
      data: [],
      meta: {
        total: 0,
        ready: false,
        date: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString(),
        stats: defaultStats
      }
    }
  }
}
