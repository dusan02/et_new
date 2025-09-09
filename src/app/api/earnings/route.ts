import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTodayStart, getNYTimeString } from '@/lib/dates'
import { serializeBigInts } from '@/lib/bigint-utils'

// Cache for 5 minutes
export const revalidate = 300

// Simple in-memory cache
const apiCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function GET() {
  const startTime = Date.now()
  try {
    // Use dynamic date based on NY timezone
    const today = getTodayStart()
    
    console.log(`[API] Starting earnings fetch for date: ${today.toISOString().split('T')[0]} (NY time: ${getNYTimeString()})`)
    
    // Check cache first
    const cacheKey = `earnings-${today.toISOString().split('T')[0]}`
    const cached = apiCache.get(cacheKey)
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log(`[CACHE] HIT - returning cached data (age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`)
      return NextResponse.json({
        success: true,
        data: cached.data,
        meta: {
          total: cached.data.length,
          duration: `${Date.now() - startTime}ms`,
          date: today.toISOString().split('T')[0],
          cached: true,
          cacheAge: Math.round((Date.now() - cached.timestamp) / 1000)
        }
      }, {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
          'X-Cache': 'HIT'
        }
      })
    }
    
    console.log(`[CACHE] MISS - fetching fresh data`)
    
    // Fetch earnings and market data in parallel first
    console.log(`[API] Fetching data from database...`)
    const [rows, marketData] = await Promise.all([
      // Fetch earnings data for today - optimized with select
      prisma.earningsTickersToday.findMany({
        where: { reportDate: today },
        select: {
          ticker: true,
          reportTime: true,
          epsActual: true,
          epsEstimate: true,
          revenueActual: true,
          revenueEstimate: true,
          sector: true,
          companyType: true,
          dataSource: true,
          fiscalPeriod: true,
          fiscalYear: true,
          primaryExchange: true,
        },
        orderBy: { ticker: 'asc' },
        take: 500,
      }),
      
      // Fetch market data from TodayEarningsMovements - optimized with select
      prisma.todayEarningsMovements.findMany({
        where: { 
          reportDate: today
        },
        select: {
          ticker: true,
          companyName: true,
          currentPrice: true,
          previousClose: true,
          priceChangePercent: true,
          marketCap: true,
          marketCapDiff: true,
          marketCapDiffBillions: true,
          sharesOutstanding: true,
          size: true,
        },
        orderBy: { ticker: 'asc' },
      })
    ])

    // Fetch guidance data only for today's tickers - optimized
    const todayTickers = rows.map(r => r.ticker)
    const guidanceData = todayTickers.length > 0 ? await prisma.benzingaGuidance.findMany({
      where: { 
        ticker: { in: todayTickers },
        fiscalYear: { not: null },
        fiscalPeriod: { not: null },
      },
      select: {
        ticker: true,
        estimatedEpsGuidance: true,
        estimatedRevenueGuidance: true,
        epsGuideVsConsensusPct: true,
        revenueGuideVsConsensusPct: true,
        previousMinEpsGuidance: true,
        previousMaxEpsGuidance: true,
        previousMinRevenueGuidance: true,
        previousMaxRevenueGuidance: true,
        fiscalPeriod: true,
        fiscalYear: true,
        releaseType: true,
        lastUpdated: true,
      },
      orderBy: [{ releaseType: 'asc' }, { lastUpdated: 'desc' }],
    }) : []

    console.log(`[API] Database query results:`, {
      earningsCount: rows.length,
      marketDataCount: marketData.length,
      guidanceDataCount: guidanceData.length
    })

    // Count actual data
    const withEpsActual = rows.filter(r => r.epsActual !== null).length
    const withRevenueActual = rows.filter(r => r.revenueActual !== null).length
    const withBothActual = rows.filter(r => r.epsActual !== null && r.revenueActual !== null).length
    
    console.log(`[API] Actual data counts:`, {
      withEpsActual,
      withRevenueActual,
      withBothActual,
      withoutAnyActual: rows.length - withEpsActual - withRevenueActual + withBothActual
    })

    // Log detailed breakdown
    const epsActualTickers = rows.filter(r => r.epsActual !== null).map(r => r.ticker)
    const revenueActualTickers = rows.filter(r => r.revenueActual !== null).map(r => r.ticker)
    
    console.log(`[API] Tickers with EPS Actual (${epsActualTickers.length}):`, epsActualTickers.join(', '))
    console.log(`[API] Tickers with Revenue Actual (${revenueActualTickers.length}):`, revenueActualTickers.join(', '))

    // Combine earnings data with market data and guidance data
    const combinedData = rows.map(earning => {
      // Find matching market data
      const marketInfo = marketData.find(m => m.ticker === earning.ticker)
      
      // Find matching guidance data (get the most recent one)
      const guidanceInfo = guidanceData
        .filter(g => g.ticker === earning.ticker)
        .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())[0]
      
      // Calculate guidance surprises
      let epsGuideSurprise = null
      let epsGuideBasis = null
      let epsGuideExtreme = false
      let revenueGuideSurprise = null
      let revenueGuideBasis = null
      let revenueGuideExtreme = false
      
      if (guidanceInfo && earning.epsEstimate) {
        epsGuideSurprise = ((guidanceInfo.estimatedEpsGuidance - earning.epsEstimate) / earning.epsEstimate) * 100
        epsGuideBasis = 'consensus'
        epsGuideExtreme = Math.abs(epsGuideSurprise) > 300
      }
      
      if (guidanceInfo && earning.revenueEstimate) {
        const guidanceRev = Number(guidanceInfo.estimatedRevenueGuidance)
        const estimateRev = Number(earning.revenueEstimate)
        revenueGuideSurprise = ((guidanceRev - estimateRev) / estimateRev) * 100
        revenueGuideBasis = 'consensus'
        revenueGuideExtreme = Math.abs(revenueGuideSurprise) > 300
      }
      
      return {
        ...earning,
        // Market data from Polygon
        companyName: marketInfo?.companyName || earning.ticker,
        size: marketInfo?.size || null,
        marketCap: marketInfo?.marketCap || null,
        marketCapDiff: marketInfo?.marketCapDiff || null,
        marketCapDiffBillions: marketInfo?.marketCapDiffBillions || null,
        currentPrice: marketInfo?.currentPrice || null,
        previousClose: marketInfo?.previousClose || null,
        priceChangePercent: marketInfo?.priceChangePercent || null,
        sharesOutstanding: marketInfo?.sharesOutstanding || null,
        // Guidance calculations
        epsGuideSurprise,
        epsGuideBasis,
        epsGuideExtreme,
        revenueGuideSurprise,
        revenueGuideBasis,
        revenueGuideExtreme,
        // Raw guidance data for debugging
        guidanceData: guidanceInfo ? {
          estimatedEpsGuidance: guidanceInfo.estimatedEpsGuidance,
          estimatedRevenueGuidance: guidanceInfo.estimatedRevenueGuidance,
          epsGuideVsConsensusPct: guidanceInfo.epsGuideVsConsensusPct,
          revenueGuideVsConsensusPct: guidanceInfo.revenueGuideVsConsensusPct,
          lastUpdated: guidanceInfo.lastUpdated?.toISOString() || null,
        } : null,
      }
    })
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    console.log(`[API] Request completed in ${duration}ms`)
    
    // Cache the result
    const serializedData = serializeBigInts(combinedData)
    apiCache.set(cacheKey, {
      data: serializedData,
      timestamp: Date.now()
    })
    
    return NextResponse.json({
      success: true,
      data: serializedData,
      meta: {
        total: combinedData.length,
        duration: `${duration}ms`,
        date: today.toISOString().split('T')[0],
        cached: false
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'X-Cache': 'MISS'
      }
    })
    
  } catch (error) {
    console.error('[API] Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}