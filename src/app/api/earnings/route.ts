import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pickEpsSurprise, pickRevSurprise, normalizeRevenueToUSD } from '@/utils/guidance'
import { getTodayStart } from '@/lib/dates'
import { serializeBigInts } from '@/lib/bigint-utils'
// Cache for 60 seconds
export const revalidate = 60

// Simple in-memory cache
const apiCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 60 * 1000 // 60 seconds

export async function GET() {
  const startTime = Date.now()
  try {
    // Use today's date since we have real data for 2025-09-08
    const today = new Date('2025-09-08')
    
    // Check cache first
    const cacheKey = `earnings-${today.toISOString().split('T')[0]}`
    const cachedEntry = apiCache.get(cacheKey)
    
    if (cachedEntry && (Date.now() - cachedEntry.timestamp) < CACHE_TTL) {
      console.log(`[CACHE] HIT for ${cacheKey}`)
      return NextResponse.json(cachedEntry.data, {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
          'X-Cache': 'HIT'
        }
      })
    }
    
    console.log(`[CACHE] MISS for ${cacheKey}`)
    
    // Fetch all data in parallel for better performance
    const [rows, marketData, guidanceData] = await Promise.all([
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
          marketCap: true,
          size: true,
          marketCapDiff: true,
          marketCapDiffBillions: true,
          priceChangePercent: true,
          sharesOutstanding: true,
          companyType: true,
          primaryExchange: true,
          reportTime: true,
        },
      }),
      
      // Fetch guidance data for all tickers - optimized with select
      prisma.benzingaGuidance.findMany({
        where: { 
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
      })
    ])

    // Get unique tickers for filtering
    const tickers = rows.map(r => r.ticker)
    
    // Create a map of market data per ticker
    const marketDataMap = new Map<string, typeof marketData[number]>()
    for (const m of marketData) {
      marketDataMap.set(m.ticker, m)
    }

    // Create a map of the latest guidance per (ticker, period, year) - EXACT MATCH ONLY
    const gKey = (t: string, p?: string | null, y?: number | null) =>
      `${t}::${(p||'').toUpperCase()}::${y ?? 'NA'}`;

    const latestGuidance: Record<string, typeof guidanceData[number]> = {};
    
    for (const g of guidanceData) {
      const key = gKey(g.ticker, g.fiscalPeriod, g.fiscalYear);
      
      // Exact match only (ticker + period + year)
      const cur = latestGuidance[key];
      if (!cur) { 
        latestGuidance[key] = g; 
      } else {
        const curScore = (cur.releaseType === 'final' ? 1 : 0);
        const newScore = (g.releaseType === 'final' ? 1 : 0);
        if (newScore > curScore) latestGuidance[key] = g;
        else if (newScore === curScore) {
          if (new Date(g.lastUpdated ?? 0) > new Date(cur.lastUpdated ?? 0)) latestGuidance[key] = g;
        }
      }
    }

    // Process each earnings record with guidance calculations (optimized)
    const data = rows.map(r => {
      const key = gKey(r.ticker, r.fiscalPeriod, r.fiscalYear);
      const guidance = latestGuidance[key];
      const market = marketDataMap.get(r.ticker);
      
      // Pre-calculate normalized values to avoid repeated calls
      const revGuide = guidance?.estimatedRevenueGuidance ? normalizeRevenueToUSD(guidance.estimatedRevenueGuidance) : null;
      const revEst = r.revenueEstimate ? normalizeRevenueToUSD(r.revenueEstimate) : null;
      const prevMinRev = guidance?.previousMinRevenueGuidance ? normalizeRevenueToUSD(guidance.previousMinRevenueGuidance) : null;
      const prevMaxRev = guidance?.previousMaxRevenueGuidance ? normalizeRevenueToUSD(guidance.previousMaxRevenueGuidance) : null;
      
      // EPS surprise calculation (only if we have data)
      let epsS: { value: number | null; basis: string | null; extreme: boolean } = { value: null, basis: null, extreme: false };
      if (guidance?.estimatedEpsGuidance != null || r.epsEstimate != null) {
        epsS = pickEpsSurprise({
          guide: guidance?.estimatedEpsGuidance ?? null,
          est: r.epsEstimate ?? null,
          consensusPct: guidance?.epsGuideVsConsensusPct ?? null,
          prevMin: guidance?.previousMinEpsGuidance ?? null,
          prevMax: guidance?.previousMaxEpsGuidance ?? null,
          gFiscal: { fiscalPeriod: guidance?.fiscalPeriod, fiscalYear: guidance?.fiscalYear ?? null },
          eFiscal: { fiscalPeriod: r.fiscalPeriod, fiscalYear: r.fiscalYear ?? null },
          gMethod: null,
          eMethod: null
        });
      }

      // Revenue surprise calculation (only if we have data)
      let revS: { value: number | null; basis: string | null; extreme: boolean } = { value: null, basis: null, extreme: false };
      if (revGuide != null || revEst != null) {
        revS = pickRevSurprise({
          guide: revGuide,
          est: revEst,
          consensusPct: guidance?.revenueGuideVsConsensusPct ?? null,
          prevMin: prevMinRev,
          prevMax: prevMaxRev,
          gFiscal: { fiscalPeriod: guidance?.fiscalPeriod, fiscalYear: guidance?.fiscalYear ?? null },
          eFiscal: { fiscalPeriod: r.fiscalPeriod, fiscalYear: r.fiscalYear ?? null }
        });
      }

      return {
        ticker: r.ticker,
        reportTime: r.reportTime,
        epsEstimate: r.epsEstimate,
        epsActual: r.epsActual,
        revenueEstimate: r.revenueEstimate,
        revenueActual: r.revenueActual,
        sector: r.sector,
        companyType: r.companyType,
        dataSource: r.dataSource,
        fiscalPeriod: r.fiscalPeriod,
        fiscalYear: r.fiscalYear,
        primaryExchange: r.primaryExchange,
        // Market data from Polygon
        companyName: market?.companyName && market.companyName.trim() !== '' ? market.companyName : r.ticker,
        size: market?.size || null,
        marketCap: market?.marketCap || null,
        marketCapDiff: market?.marketCapDiff || null,
        marketCapDiffBillions: market?.marketCapDiffBillions || null,
        currentPrice: market?.currentPrice || null,
        previousClose: market?.previousClose || null,
        priceChangePercent: market?.priceChangePercent || null,
        sharesOutstanding: market?.sharesOutstanding || null,
        // Guidance calculations (with validation)
        epsGuideSurprise: (epsS.value != null && isFinite(epsS.value)) ? epsS.value : null,
        epsGuideBasis: epsS.basis ?? null,
        epsGuideExtreme: epsS.extreme,
        revenueGuideSurprise: (revS.value != null && isFinite(revS.value)) ? revS.value : null,
        revenueGuideBasis: revS.basis ?? null,
        revenueGuideExtreme: revS.extreme,
        // Raw guidance data for debugging (only if exists)
        guidanceData: guidance ? {
          estimatedEpsGuidance: guidance.estimatedEpsGuidance,
          estimatedRevenueGuidance: guidance.estimatedRevenueGuidance,
          epsGuideVsConsensusPct: guidance.epsGuideVsConsensusPct,
          revenueGuideVsConsensusPct: guidance.revenueGuideVsConsensusPct,
          lastUpdated: guidance.lastUpdated,
        } : null,
      }
    })

    // Serialize BigInt values before sending
    const serializedData = serializeBigInts(data)
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    // Log performance metrics
    console.log(`[PERF] /api/earnings: ${duration}ms, ${data.length} records`)
    
    const responseData = { 
      date: today, 
      count: data.length, 
      data: serializedData,
      performance: {
        duration: duration,
        records: data.length
      }
    }
    
    // Cache the response
    apiCache.set(cacheKey, { data: responseData, timestamp: Date.now() })
    
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        'X-Cache': 'MISS'
      }
    })
  } catch (e: any) {
    console.error('Error in /api/earnings:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
