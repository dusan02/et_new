import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTodayStart, getNYTimeString, serializeBigInts, isoDate } from '@/modules/shared'
import { calculateSurprise } from '@/modules/earnings'
import { validateRequest, checkRateLimit, earningsQuerySchema, type EarningsQuery } from '@/lib/validation'
import { getMonitoring } from '@/lib/monitoring'
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

// Cache for 5 minutes for better performance
export const revalidate = 300

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  let monitoring: any = null
  
  try {
    // Initialize monitoring
    try {
      monitoring = getMonitoring()
    } catch (error) {
      console.warn('Monitoring not available:', error)
    }
    
    // 1. Rate limiting check
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    
    if (!checkRateLimit(clientIP, 60, 60000)) { // 60 requests per minute
      // Track rate limit hit
      if (monitoring) {
        monitoring.trackMetric({
          name: 'api.rate_limit_hit',
          value: 1,
          tags: { endpoint: '/api/earnings', ip: clientIP }
        })
      }
      
      return NextResponse.json(
        { error: 'Rate limit exceeded', message: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }
    
    // 2. Input validation
    const validation = validateRequest(earningsQuerySchema, request)
    if (!validation.success) {
      // Track validation error
      if (monitoring) {
        monitoring.trackMetric({
          name: 'api.validation_error',
          value: 1,
          tags: { endpoint: '/api/earnings', error_type: 'validation' }
        })
      }
      
      return NextResponse.json(
        { 
          error: 'Invalid request parameters',
          details: validation.error.details
        },
        { status: 400 }
      )
    }
    
    const { date: requestedDate, ticker, limit, offset, sector, reportTime } = validation.data
    
    // 3. Use validated date or default to today (using same logic as worker)
    const todayString = requestedDate || isoDate()
    const today = new Date(todayString + 'T00:00:00.000Z')
    
    console.log(`[API] Starting earnings fetch for date: ${todayString} (NY time: ${getNYTimeString()})`)
    
    // Check cache first
    const cacheKey = `earnings-${todayString}`
    const cached = getCachedData(cacheKey)
    
    if (cached) {
      const cacheAge = getCacheAge(cached)
      const cachedData = cached.data as any[]
      console.log(`[CACHE] HIT - returning cached data (age: ${cacheAge}s)`)
      return NextResponse.json({
        success: true,
        data: cachedData,
        meta: {
          total: cachedData.length,
          duration: `${Date.now() - startTime}ms`,
          date: todayString,
          cached: true,
          cacheAge: cacheAge
        }
      }, {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
          'X-Cache': 'HIT'
        }
      })
    }
    
    console.log(`[CACHE] MISS - fetching fresh data`)
    
    // Fetch combined earnings and market data with optimized JOIN query
    console.log(`[API] Fetching combined data from database with optimized JOIN...`)
    
    // Use optimized Prisma query - fallback to separate queries for now
    const combinedRows = await prisma.earningsTickersToday.findMany({
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
    })
    
    // Get market data separately (optimized query)
    const marketData = await prisma.todayEarningsMovements.findMany({
      where: { reportDate: today },
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
      }
    })

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
      combinedRowsCount: combinedRows.length,
      guidanceDataCount: guidanceData.length
    })

    // Count actual data
    const withEpsActual = combinedRows.filter(r => r.epsActual !== null).length
    const withRevenueActual = combinedRows.filter(r => r.revenueActual !== null).length
    const withBothActual = combinedRows.filter(r => r.epsActual !== null && r.revenueActual !== null).length
    
    console.log(`[API] Actual data counts:`, {
      withEpsActual,
      withRevenueActual,
      withBothActual,
      withoutAnyActual: combinedRows.length - withEpsActual - withRevenueActual + withBothActual
    })

    // Log detailed breakdown
    const epsActualTickers = combinedRows.filter(r => r.epsActual !== null).map(r => r.ticker)
    const revenueActualTickers = combinedRows.filter(r => r.revenueActual !== null).map(r => r.ticker)
    
    console.log(`[API] Tickers with EPS Actual (${epsActualTickers.length}):`, epsActualTickers.join(', '))
    console.log(`[API] Tickers with Revenue Actual (${revenueActualTickers.length}):`, revenueActualTickers.join(', '))

    // Transform combined data - manually join earnings and market data
    const combinedData = combinedRows.map(row => {
      // Find matching market data for this ticker
      const marketInfo = marketData.find(m => m.ticker === row.ticker)
      
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
        
        // Calculate surprise values
        const epsSurprise = calculateSurprise(row.epsActual, row.epsEstimate)
        const revenueSurprise = calculateSurprise(
          row.revenueActual ? Number(row.revenueActual) : null,
          row.revenueEstimate ? Number(row.revenueEstimate) : null
        )
      const compatibleGuidance = null
      
      return {
        // Base earnings data
        ticker: row.ticker,
        reportTime: row.reportTime,
        epsActual: row.epsActual,
        epsEstimate: row.epsEstimate,
        revenueActual: row.revenueActual,
        revenueEstimate: row.revenueEstimate,
        sector: row.sector,
        companyType: row.companyType,
        dataSource: row.dataSource,
        fiscalPeriod: row.fiscalPeriod,
        fiscalYear: row.fiscalYear,
        primaryExchange: row.primaryExchange,
        // Market data (manually joined)
        companyName: marketInfo?.companyName || row.ticker,
        marketCap: marketInfo?.marketCap && marketInfo.marketCap > 0 ? marketInfo.marketCap : null,
        size: marketInfo?.marketCap && marketInfo.marketCap > 0 ? marketInfo.size : null,
        marketCapDiff: marketInfo?.marketCapDiff ?? null,
        currentPrice: marketInfo?.currentPrice ?? null,
        previousClose: marketInfo?.previousClose ?? null,
        priceChangePercent: marketInfo?.priceChangePercent ?? null,
        marketCapDiffBillions: marketInfo?.marketCapDiffBillions ?? null,
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
        // Surprise calculations
        epsSurprise,
        revenueSurprise
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
    
    // Track error
    if (monitoring) {
      monitoring.trackError({
        error: error instanceof Error ? error : new Error(String(error)),
        context: {
          endpoint: '/api/earnings',
          method: 'GET',
          duration: Date.now() - startTime
        }
      })
    }
    
    // Track failed API call
    if (monitoring) {
      monitoring.trackAPICall('/api/earnings', 'GET', Date.now() - startTime, 500)
    }
    
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}