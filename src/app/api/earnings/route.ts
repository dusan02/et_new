import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTodayStart, getNYTimeString, isoDate } from '@/modules/shared'
import { toJSONSafe } from '@/modules/shared'
import { calculateSurprise } from '@/modules/earnings'
import { validateRequest, checkRateLimit, earningsQuerySchema, type EarningsQuery } from '@/lib/validation'
import { getMonitoring } from '@/lib/monitoring'
import { loadEnvironmentConfig } from '../../../modules/shared/config/env.config'
import { createJsonResponse, stringifyHeaders } from '@/lib/json-utils'
import { detectMarketSession, getTTLForSession, type MarketSession } from '@/lib/market-session'
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
// Force dynamic rendering to avoid static generation issues with query parameters
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  let monitoring: any = null
  
  try {
    // Parse query parameters for debug mode and cache control
    const { searchParams } = new URL(request.url)
    const debugMode = searchParams.get('debug') === '1'
    const tickerFilter = searchParams.get('ticker')
    const noCache = searchParams.get('nocache') === '1'
    
    // Market session detection for TTL
    const nowUTC = new Date()
    const marketSession = detectMarketSession(nowUTC, 'America/New_York')
    const ttl = getTTLForSession(marketSession, noCache)
    
    // Build info for debug
    const COMMIT = process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA || 'unknown'
    const TZ = process.env.TZ || 'UTC'
    
    // ✅ validácia až teraz (soft pri builde, strict v runtime)
    let env: any = {}
    try {
      env = loadEnvironmentConfig()
    } catch (error) {
      console.warn('Environment config not available, using defaults:', error)
      // Use default values if environment config fails
      env = {
        FINNHUB_API_KEY: process.env.FINNHUB_API_KEY || '',
        POLYGON_API_KEY: process.env.POLYGON_API_KEY || '',
        DATABASE_URL: process.env.DATABASE_URL || 'file:./prisma/dev.db'
      }
    }
    
    // Initialize monitoring
    try {
      monitoring = getMonitoring()
    } catch (error) {
      console.warn('Monitoring not available:', error)
    }
    
    // Skip rate limiting in production build to avoid dynamic server usage
    // Rate limiting is handled by middleware or external services
    
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
    
    // Check cache first (respect nocache parameter)
    const cacheKey = `earnings-${todayString}`
    const cached = noCache ? null : getCachedData(cacheKey)
    
    if (cached) {
      const cacheAge = getCacheAge(cached)
      const cachedData = cached.data as any[]
      console.log(`[CACHE] HIT - returning cached data (age: ${cacheAge}s, ttl: ${ttl}s)`)
    // Calculate debug statistics
    let previousSourceStats = { aggs: 0, snapshot: 0, none: 0 }
    let zeroChangeCount = 0
    
    if (debugMode && cachedData.length > 0) {
      // Analyze cached data for debug stats
      cachedData.forEach((item: any) => {
        if (item.debug) {
          const source = item.debug.previousSource || 'none'
          if (source === 'aggs') previousSourceStats.aggs++
          else if (source === 'snapshot') previousSourceStats.snapshot++
          else previousSourceStats.none++
          
          if (item.priceChangePercent === 0) zeroChangeCount++
        }
      })
    }
    
    const zeroChangeRatio = cachedData.length > 0 ? zeroChangeCount / cachedData.length : 0
    
    // Prepare debug info
    const debugInfo = debugMode ? {
      debug: {
        commit: COMMIT,
        tz: TZ,
        serverNow: nowUTC.toISOString(),
        marketSession,
        ttl,
        noCache,
        cacheKey,
        cacheAgeSeconds: cacheAge,
        previousSourceStats,
        zeroChangeRatio: parseFloat(zeroChangeRatio.toFixed(3)),
        totalTickers: cachedData.length,
        zeroChangeTickers: zeroChangeCount
      }
    } : {}

    const payload = {
      status: cachedData.length > 0 ? 'ok' : 'no-data',
      data: cachedData,
      meta: {
        total: cachedData.length,
        ready: true, // Data is ready if we have cache
        duration: `${Date.now() - startTime}ms`,
        date: todayString,
        requestedDate: todayString,
        fallbackUsed: false,
        cached: true,
        cacheAge: cacheAge,
        ...debugInfo
      }
    }

    const headers = {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      'X-Cache': 'HIT',
      ...(debugMode && {
        'x-build': COMMIT,
        'x-cache': 'hit',
        'x-isr-age': String(cacheAge),
        'x-env-tz': TZ,
        'x-commit': COMMIT,
        'x-market-session': marketSession,
        'x-ttl': String(ttl)
      })
    }

    return createJsonResponse(payload, stringifyHeaders(headers))
    }
    
    console.log(`[CACHE] MISS - fetching fresh data`)
    
    // Fetch combined earnings and market data with optimized JOIN query
    console.log(`[API] Fetching combined data from database with optimized JOIN...`)
    
    // 🎯 OPTIMIZED: Use MarketData table to get only tickers with market cap
    let combinedRows = await prisma.marketData.findMany({
      where: { 
        reportDate: today,
        marketCap: { gt: 0 } // Only tickers with market cap > 0
      },
      select: {
        ticker: true,
        currentPrice: true,
        previousClose: true,
        priceChangePercent: true,
        marketCap: true,
        size: true,
        companyName: true,
        companyType: true,
        primaryExchange: true,
        // Join with earnings data
        earningsTickersToday: {
          select: {
            reportTime: true,
            epsActual: true,
            epsEstimate: true,
            revenueActual: true,
            revenueEstimate: true,
            sector: true,
            dataSource: true,
            fiscalPeriod: true,
            fiscalYear: true,
          }
        }
      },
      orderBy: { ticker: 'asc' },
      take: 500,
    })
    
    // Flatten the joined data structure
    combinedRows = combinedRows.map(row => ({
      ticker: row.ticker,
      reportTime: row.earningsTickersToday?.reportTime || null,
      epsActual: row.earningsTickersToday?.epsActual || null,
      epsEstimate: row.earningsTickersToday?.epsEstimate || null,
      revenueActual: row.earningsTickersToday?.revenueActual || null,
      revenueEstimate: row.earningsTickersToday?.revenueEstimate || null,
      sector: row.earningsTickersToday?.sector || null,
      companyType: row.companyType || row.earningsTickersToday?.companyType || null,
      dataSource: row.earningsTickersToday?.dataSource || null,
      fiscalPeriod: row.earningsTickersToday?.fiscalPeriod || null,
      fiscalYear: row.earningsTickersToday?.fiscalYear || null,
      primaryExchange: row.primaryExchange || row.earningsTickersToday?.primaryExchange || null,
      // Add market data fields
      currentPrice: row.currentPrice,
      previousClose: row.previousClose,
      priceChangePercent: row.priceChangePercent,
      marketCap: row.marketCap,
      size: row.size,
      companyName: row.companyName,
    }))
    
    // ✅ NO FALLBACK: If no data for today, return explicit no-data status
    let actualDate = today
    let responseStatus = 'ok'
    if (combinedRows.length === 0) {
      console.log(`[API] No data for ${todayString} - returning no-data status (no fallback to old data)`)
      responseStatus = 'no-data'
      // Keep combinedRows as empty array - no fallback to old data
    }
    
    // Get market data separately (optimized query) - use today (no fallback)
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

    // Apply ticker filter if specified in debug mode
    const filteredRows = tickerFilter 
      ? combinedRows.filter(row => row.ticker === tickerFilter)
      : combinedRows

    // Transform combined data - manually join earnings and market data
    const combinedData = filteredRows.map(row => {
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
      
      const result = {
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
        currentPrice: marketInfo?.currentPrice != null ? Number(marketInfo.currentPrice) : null,
        previousClose: marketInfo?.previousClose != null ? Number(marketInfo.previousClose) : null,
        priceChangePercent: marketInfo?.priceChangePercent ?? null,
        ...(debugMode && {
          debug: {
            ticker: row.ticker,
            currentPrice: marketInfo?.currentPrice,
            previousClose: marketInfo?.previousClose,
            priceChangePercent: marketInfo?.priceChangePercent,
            currentPriceType: typeof marketInfo?.currentPrice,
            previousCloseType: typeof marketInfo?.previousClose,
            priceChangePercentType: typeof marketInfo?.priceChangePercent,
            marketInfoSource: marketInfo ? 'db' : 'null',
            previousSource: marketInfo?.previousClose ? 'db-market-data' : 'none',
            isFallback: marketInfo?.currentPrice === marketInfo?.previousClose,
            rawChange: marketInfo?.currentPrice && marketInfo?.previousClose 
              ? ((marketInfo.currentPrice - marketInfo.previousClose) / marketInfo.previousClose * 100)
              : null
          }
        }),
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

      // Debug logovanie pre sanity check
      console.log('[API OUT] %s | priceChangePercent=%s (type=%s)', 
        result.ticker, result.priceChangePercent, typeof result.priceChangePercent);

      return result;
    })
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    console.log(`[API] Request completed in ${duration}ms`)
    
    // Cache the result with safe BigInt serialization (respect TTL)
    const serializedData = toJSONSafe(combinedData)
    if (ttl > 0) {
      setCachedData(cacheKey, serializedData)
    }
    
    // Calculate debug statistics for fresh data
    let previousSourceStats = { aggs: 0, snapshot: 0, none: 0 }
    let zeroChangeCount = 0
    
    if (debugMode && combinedData.length > 0) {
      combinedData.forEach((item: any) => {
        if (item.debug) {
          const source = item.debug.previousSource || 'none'
          if (source === 'aggs') previousSourceStats.aggs++
          else if (source === 'snapshot') previousSourceStats.snapshot++
          else previousSourceStats.none++
          
          if (item.priceChangePercent === 0) zeroChangeCount++
        }
      })
    }
    
    const zeroChangeRatio = combinedData.length > 0 ? zeroChangeCount / combinedData.length : 0
    
    // Prepare debug info for fresh data
    const debugInfo = debugMode ? {
      debug: {
        commit: COMMIT,
        tz: TZ,
        serverNow: nowUTC.toISOString(),
        marketSession,
        ttl,
        noCache,
        cacheKey,
        dataSource: 'fresh-fetch',
        tickerFilter: tickerFilter || 'all',
        previousSourceStats,
        zeroChangeRatio: parseFloat(zeroChangeRatio.toFixed(3)),
        totalTickers: combinedData.length,
        zeroChangeTickers: zeroChangeCount
      }
    } : {}

    const payload = {
      status: responseStatus,
      data: serializedData,
      meta: {
        total: combinedData.length,
        ready: combinedData.length > 0, // Ready if we have data
        duration: `${duration}ms`,
        date: actualDate.toISOString().split('T')[0],
        requestedDate: today.toISOString().split('T')[0],
        fallbackUsed: false, // Never use fallback anymore
        cached: false,
        ...debugInfo
      }
    }

    const headers = {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      'X-Cache': 'MISS',
      ...(debugMode && {
        'x-build': COMMIT,
        'x-cache': 'miss',
        'x-isr-age': '0',
        'x-env-tz': TZ,
        'x-commit': COMMIT,
        'x-market-session': marketSession,
        'x-ttl': String(ttl)
      })
    }

    return createJsonResponse(payload, stringifyHeaders(headers))
    
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