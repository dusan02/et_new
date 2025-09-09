import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTodayStart, getNYTimeString } from '@/lib/dates'
import { serializeBigInts } from '@/lib/bigint-utils'
// 🚫 GUIDANCE DISABLED FOR PRODUCTION - Import commented out
// import { 
//   isGuidanceCompatible, 
//   calculateGuidanceSurprise 
// } from '@/lib/guidance-utils'
import { 
  getCachedData, 
  setCachedData, 
  getCacheAge 
} from '@/lib/cache-utils'

// Cache for 1 minute (shorter for testing)
export const revalidate = 60

export async function GET() {
  const startTime = Date.now()
  try {
    // Use dynamic date based on NY timezone
    const today = getTodayStart()
    
    console.log(`[API] Starting earnings fetch for date: ${today.toISOString().split('T')[0]} (NY time: ${getNYTimeString()})`)
    
    // Check cache first
    const cacheKey = `earnings-${today.toISOString().split('T')[0]}`
    const cached = getCachedData(cacheKey)
    
    if (cached) {
      console.log(`[CACHE] HIT - returning cached data (age: ${getCacheAge(cached.timestamp)}s)`)
      return NextResponse.json({
        success: true,
        data: cached.data,
        meta: {
          total: cached.data.length,
          duration: `${Date.now() - startTime}ms`,
          date: today.toISOString().split('T')[0],
          cached: true,
          cacheAge: getCacheAge(cached.timestamp)
        }
      }, {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
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

    // 🚫 GUIDANCE DISABLED FOR PRODUCTION - COMMENTED OUT
    // TODO: Re-enable when guidance issues are resolved
    /*
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
        notes: true,
        lastUpdated: true,
      },
      orderBy: [{ releaseType: 'asc' }, { lastUpdated: 'desc' }],
    }) : []
    */
    const guidanceData: any[] = [] // Empty array for production

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
      
      // 🚫 GUIDANCE DISABLED FOR PRODUCTION - COMMENTED OUT
      // TODO: Re-enable when guidance issues are resolved
      /*
      // Find matching guidance data - try exact match first, then fallback to latest
      const tickerGuidance = guidanceData.filter(g => g.ticker === earning.ticker)
      
      let compatibleGuidance = tickerGuidance.find(g => isGuidanceCompatible(
        { fiscalPeriod: g.fiscalPeriod, fiscalYear: g.fiscalYear },
        { fiscalPeriod: earning.fiscalPeriod, fiscalYear: earning.fiscalYear }
      ))
      
      // If no exact match, use the most recent guidance for this ticker
      if (!compatibleGuidance && tickerGuidance.length > 0) {
        compatibleGuidance = tickerGuidance.sort((a, b) => {
          // Sort by year desc, then by period (Q4 > Q3 > Q2 > Q1 > FY)
          if (a.fiscalYear !== b.fiscalYear) return (b.fiscalYear || 0) - (a.fiscalYear || 0)
          const periodOrder: Record<string, number> = { 'Q4': 4, 'Q3': 3, 'Q2': 2, 'Q1': 1, 'FY': 0 }
          const aPeriod = a.fiscalPeriod || ''
          const bPeriod = b.fiscalPeriod || ''
          return (periodOrder[bPeriod] || 0) - (periodOrder[aPeriod] || 0)
        })[0]
      }
      
      // Calculate guidance surprises - check if periods match exactly
      let epsGuideSurprise = null
      let epsGuideBasis = null
      let epsGuideExtreme = false
      let revenueGuideSurprise = null
      let revenueGuideBasis = null
      let revenueGuideExtreme = false
      
      if (compatibleGuidance) {
        // Check if periods match exactly
        const periodsMatch = isGuidanceCompatible(
          { fiscalPeriod: compatibleGuidance.fiscalPeriod, fiscalYear: compatibleGuidance.fiscalYear },
          { fiscalPeriod: earning.fiscalPeriod, fiscalYear: earning.fiscalYear }
        )
        
        if (earning.epsEstimate && compatibleGuidance.estimatedEpsGuidance) {
          if (periodsMatch) {
            // Exact match - calculate surprise
            const epsResult = calculateGuidanceSurprise(
              compatibleGuidance.estimatedEpsGuidance,
              earning.epsEstimate,
              false // isRevenue = false for EPS
            )
            epsGuideSurprise = epsResult.surprise
            epsGuideBasis = 'consensus'
            epsGuideExtreme = epsResult.extreme
          } else {
            // Period mismatch - show guidance but no surprise calculation
            epsGuideBasis = 'guidance_only'
          }
        }
        
        if (earning.revenueEstimate && compatibleGuidance.estimatedRevenueGuidance) {
          if (periodsMatch) {
            // Exact match - calculate surprise
            const revenueResult = calculateGuidanceSurprise(
              compatibleGuidance.estimatedRevenueGuidance,
              earning.revenueEstimate,
              true // isRevenue = true for revenue
            )
            revenueGuideSurprise = revenueResult.surprise
            revenueGuideBasis = 'consensus'
            revenueGuideExtreme = revenueResult.extreme
          } else {
            // Period mismatch - show guidance but no surprise calculation
            revenueGuideBasis = 'guidance_only'
          }
        }
      }
      */
      
      // Default values for production (no guidance)
      const epsGuideSurprise = null
      const epsGuideBasis = null
      const epsGuideExtreme = false
      const revenueGuideSurprise = null
      const revenueGuideBasis = null
      const revenueGuideExtreme = false
      const compatibleGuidance = null
      
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
        // 🚫 GUIDANCE DISABLED FOR PRODUCTION - Raw guidance data commented out
        // guidanceData: compatibleGuidance ? {
        //   estimatedEpsGuidance: compatibleGuidance.estimatedEpsGuidance,
        //   estimatedRevenueGuidance: compatibleGuidance.estimatedRevenueGuidance,
        //   epsGuideVsConsensusPct: compatibleGuidance.epsGuideVsConsensusPct,
        //   revenueGuideVsConsensusPct: compatibleGuidance.revenueGuideVsConsensusPct,
        //   notes: compatibleGuidance.notes,
        //   lastUpdated: compatibleGuidance.lastUpdated?.toISOString() || null,
        //   fiscalPeriod: compatibleGuidance.fiscalPeriod,
        //   fiscalYear: compatibleGuidance.fiscalYear,
        // } : null,
        guidanceData: null, // Always null for production
      }
    })
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    console.log(`[API] Request completed in ${duration}ms`)
    
    // Cache the result
    const serializedData = serializeBigInts(combinedData)
    setCachedData(cacheKey, serializedData)
    
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