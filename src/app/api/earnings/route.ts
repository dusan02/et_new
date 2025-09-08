import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pickEpsSurprise, pickRevSurprise, normalizeRevenueToUSD } from '@/utils/guidance'
import { getTodayStart } from '@/lib/dates'
import { serializeBigInts } from '@/lib/bigint-utils'

export async function GET() {
  try {
    // Use today's date since we have real data for 2025-09-08
    const today = new Date('2025-09-08')
    
    // Fetch earnings data for today (where we have real data)
    const rows = await prisma.earningsTickersToday.findMany({
      where: { reportDate: today },
      orderBy: { ticker: 'asc' },
      take: 500,
    })

    // Get unique tickers for guidance lookup
    const tickers = rows.map(r => r.ticker)
    
    // Fetch market data from TodayEarningsMovements
    const marketData = await prisma.todayEarningsMovements.findMany({
      where: { 
        ticker: { in: tickers },
        reportDate: today
      },
    })
    
    // Create a map of market data per ticker
    const marketDataMap = new Map<string, typeof marketData[number]>()
    for (const m of marketData) {
      marketDataMap.set(m.ticker, m)
    }
    
    // Fetch guidance data for these tickers with fiscal period/year
    const guidanceData = await prisma.benzingaGuidance.findMany({
      where: { 
        ticker: { in: tickers },
        fiscalYear: { not: null },
        fiscalPeriod: { not: null },
      },
      orderBy: [{ releaseType: 'asc' }, { lastUpdated: 'desc' }],
    })

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

    // Process each earnings record with guidance calculations
    const data = rows.map(r => {
      const key = gKey(r.ticker, r.fiscalPeriod, r.fiscalYear);
      const guidance = latestGuidance[key]; // EXACT MATCH ONLY - no fallback
      const market = marketDataMap.get(r.ticker);
      
      // EPS surprise calculation
      const epsS = pickEpsSurprise({
        guide: guidance?.estimatedEpsGuidance ?? null,
        est: r.epsEstimate ?? null,
        consensusPct: guidance?.epsGuideVsConsensusPct ?? null,
        prevMin: guidance?.previousMinEpsGuidance ?? null,
        prevMax: guidance?.previousMaxEpsGuidance ?? null,
        gFiscal: { fiscalPeriod: guidance?.fiscalPeriod, fiscalYear: guidance?.fiscalYear ?? null },
        eFiscal: { fiscalPeriod: r.fiscalPeriod, fiscalYear: r.fiscalYear ?? null },
        gMethod: guidance?.epsMethod ?? null, // Benzinga method
        eMethod: null // Finnhub doesn't provide method info
      });

      // Revenue surprise calculation with USD normalization
      const revGuide = normalizeRevenueToUSD(guidance?.estimatedRevenueGuidance ?? null);
      const revEst = normalizeRevenueToUSD(r.revenueEstimate ?? null);

      const revS = pickRevSurprise({
        guide: revGuide,
        est: revEst,
        consensusPct: guidance?.revenueGuideVsConsensusPct ?? null,
        prevMin: normalizeRevenueToUSD(guidance?.previousMinRevenueGuidance ?? null),
        prevMax: normalizeRevenueToUSD(guidance?.previousMaxRevenueGuidance ?? null),
        gFiscal: { fiscalPeriod: guidance?.fiscalPeriod, fiscalYear: guidance?.fiscalYear ?? null },
        eFiscal: { fiscalPeriod: r.fiscalPeriod, fiscalYear: r.fiscalYear ?? null }
      });

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
        companyName: market?.companyName || r.ticker,
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
        // Raw guidance data for debugging
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
