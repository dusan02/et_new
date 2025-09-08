import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pickEpsSurprise, pickRevSurprise, normalizeRevenueToUSD } from '@/utils/guidance'
import { getTodayStart } from '@/lib/dates'
import { serializeBigInts } from '@/lib/bigint-utils'

// Cache for 60 seconds
export const revalidate = 60

export async function GET() {
  try {
    // Use today's date since we have real data for 2025-09-08
    const today = new Date('2025-09-08')
    
    // Fetch all data in parallel for better performance
    const [rows, marketData, guidanceData] = await Promise.all([
      // Fetch earnings data for today
      prisma.earningsTickersToday.findMany({
        where: { reportDate: today },
        orderBy: { ticker: 'asc' },
        take: 500,
      }),
      
      // Fetch market data from TodayEarningsMovements
      prisma.todayEarningsMovements.findMany({
        where: { 
          reportDate: today
        },
      }),
      
      // Fetch guidance data for all tickers
      prisma.benzingaGuidance.findMany({
        where: { 
          fiscalYear: { not: null },
          fiscalPeriod: { not: null },
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

    return NextResponse.json({ 
      date: today, 
      count: data.length, 
      data: serializedData 
    })
  } catch (e: any) {
    console.error('Error in /api/earnings:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
