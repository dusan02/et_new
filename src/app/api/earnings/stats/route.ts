import { NextRequest, NextResponse } from 'next/server';
import { toJSONSafe } from '@/modules/shared';
import { prisma } from '@/lib/prisma';
import { getTodayStart, getNYTimeString } from '@/modules/shared';
import { validateRequest, checkRateLimit, statsQuerySchema } from '@/lib/validation';

// Force dynamic rendering to avoid static generation issues with query parameters
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: NextRequest) {
  try {
    // Skip rate limiting in production build to avoid dynamic server usage
    // Rate limiting is handled by middleware or external services
    
    // 2. Input validation
    const validation = validateRequest(statsQuerySchema, request)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request parameters',
          details: validation.error.details
        },
        { status: 400 }
      )
    }
    
    const { date: requestedDate } = validation.data
    
    // 3. Use validated date or default to today
    const today = requestedDate ? new Date(requestedDate + 'T00:00:00.000Z') : getTodayStart();
    
    console.log(`[STATS] Fetching stats for date: ${today.toISOString().split('T')[0]} (NY time: ${getNYTimeString()})`);

    // ✅ NO FALLBACK: Use today's date only (no fallback to old data)
    let actualDate = today
    const todayCount = await prisma.earningsTickersToday.count({
      where: { reportDate: today }
    })
    
    if (todayCount === 0) {
      console.log(`[STATS] No data for ${today.toISOString().split('T')[0]} - returning empty stats (no fallback to old data)`)
      // Keep actualDate as today - no fallback to old data
    }

    // Fetch real stats from database using actualDate
    const [
      totalEarnings,
      withEps,
      withRevenue,
      sizeDistribution,
      topGainers,
      topLosers,
      earningsWithActuals
    ] = await Promise.all([
      // Total earnings count - only tickers with market cap data
      prisma.marketData.count({
        where: { 
          reportDate: actualDate,
          marketCap: { gt: 0 }
        }
      }),
      
      // Count with EPS data - only for tickers with market cap
      prisma.marketData.count({
        where: { 
          reportDate: actualDate,
          marketCap: { gt: 0 },
          earningsTickersToday: {
            epsActual: { not: null }
          }
        }
      }),
      
      // Count with revenue data - only for tickers with market cap
      prisma.marketData.count({
        where: { 
          reportDate: actualDate,
          marketCap: { gt: 0 },
          earningsTickersToday: {
            revenueActual: { not: null }
          }
        }
      }),
      
      // Size distribution - from MarketData
      prisma.marketData.findMany({
        where: { 
          reportDate: actualDate,
          marketCap: { gt: 0 }
        },
        select: {
          size: true,
          marketCap: true
        }
      }),
      
      // Top gainers - from MarketData
      prisma.marketData.findMany({
        where: { 
          reportDate: actualDate,
          marketCap: { gt: 0 },
          priceChangePercent: { not: null }
        },
        orderBy: { priceChangePercent: 'desc' },
        take: 5,
        select: {
          ticker: true,
          companyName: true,
          priceChangePercent: true,
          currentPrice: true,
          marketCapDiffBillions: true
        }
      }),
      
      // Top losers - from MarketData
      prisma.marketData.findMany({
        where: { 
          reportDate: actualDate,
          marketCap: { gt: 0 },
          priceChangePercent: { not: null }
        },
        orderBy: { priceChangePercent: 'asc' },
        take: 5,
        select: {
          ticker: true,
          companyName: true,
          priceChangePercent: true,
          currentPrice: true,
          marketCapDiffBillions: true
        }
      }),
      
      // All earnings with actual and estimate data - only for tickers with market cap
      prisma.marketData.findMany({
        where: { 
          reportDate: actualDate,
          marketCap: { gt: 0 },
          earningsTickersToday: {
            OR: [
              {
                epsActual: { not: null },
                epsEstimate: { not: null }
              },
              {
                revenueActual: { not: null },
                revenueEstimate: { not: null }
              }
            ]
          }
        },
        select: {
          ticker: true,
          earningsTickersToday: {
            select: {
              epsActual: true,
              epsEstimate: true,
              revenueActual: true,
              revenueEstimate: true
            }
          }
        }
      })
    ]);

    // Transform size distribution
    const sizeGroups = new Map();
    sizeDistribution.forEach(item => {
      const size = item.size || 'Unknown';
      if (!sizeGroups.has(size)) {
        sizeGroups.set(size, { count: 0, totalMarketCap: 0 });
      }
      sizeGroups.get(size).count++;
      sizeGroups.get(size).totalMarketCap += Number(item.marketCap);
    });

    const transformedSizeDistribution = Array.from(sizeGroups.entries()).map(([size, data]) => ({
      size,
      _count: { size: data.count },
      _sum: { marketCap: data.totalMarketCap }
    }));

    // Transform top gainers
    const transformedTopGainers = topGainers.map(item => ({
      ticker: item.ticker,
      companyName: item.companyName,
      priceChangePercent: item.priceChangePercent,
      marketCapDiffBillions: item.marketCapDiffBillions
    }));

    // Transform top losers
    const transformedTopLosers = topLosers.map(item => ({
      ticker: item.ticker,
      companyName: item.companyName,
      priceChangePercent: item.priceChangePercent,
      marketCapDiffBillions: item.marketCapDiffBillions
    }));

    // Calculate beat/miss data - flatten the nested structure
    const flattenedEarnings = earningsWithActuals.map(item => ({
      ticker: item.ticker,
      epsActual: item.earningsTickersToday?.epsActual,
      epsEstimate: item.earningsTickersToday?.epsEstimate,
      revenueActual: item.earningsTickersToday?.revenueActual,
      revenueEstimate: item.earningsTickersToday?.revenueEstimate
    }));

    const epsBeats = flattenedEarnings
      .filter(e => e.epsActual && e.epsEstimate && e.epsActual > e.epsEstimate)
      .sort((a, b) => (b.epsActual! - b.epsEstimate!) - (a.epsActual! - a.epsEstimate!));
    
    const epsMisses = flattenedEarnings
      .filter(e => e.epsActual && e.epsEstimate && e.epsActual < e.epsEstimate)
      .sort((a, b) => (a.epsActual! - a.epsEstimate!) - (b.epsActual! - b.epsEstimate!));
    
    const revenueBeats = flattenedEarnings
      .filter(e => e.revenueActual && e.revenueEstimate && e.revenueActual > e.revenueEstimate)
      .sort((a, b) => Number(b.revenueActual! - b.revenueEstimate!) - Number(a.revenueActual! - a.revenueEstimate!));
    
    const revenueMisses = flattenedEarnings
      .filter(e => e.revenueActual && e.revenueEstimate && e.revenueActual < e.revenueEstimate)
      .sort((a, b) => Number(a.revenueActual! - a.revenueEstimate!) - Number(b.revenueActual! - b.revenueEstimate!));

    // Get the most recent update time from the database
    const mostRecentEarnings = await prisma.earningsTickersToday.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true }
    });
    
    const mostRecentMarket = await prisma.marketData.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true }
    });

    // Use the most recent update time from either table
    const lastUpdated = mostRecentEarnings?.updatedAt && mostRecentMarket?.updatedAt
      ? new Date(Math.max(mostRecentEarnings.updatedAt.getTime(), mostRecentMarket.updatedAt.getTime()))
      : mostRecentEarnings?.updatedAt || mostRecentMarket?.updatedAt || new Date();

    const stats = {
      totalCompanies: totalEarnings,
      withEpsActual: withEps,
      withRevenueActual: withRevenue,
      withBothActual: flattenedEarnings.filter(e => e.epsActual && e.revenueActual).length,
      withoutAnyActual: totalEarnings - flattenedEarnings.length,
      lastUpdated: lastUpdated.toISOString(),
      // Fallback information
      requestedDate: today.toISOString().split('T')[0],
      actualDate: actualDate.toISOString().split('T')[0],
      fallbackUsed: actualDate.getTime() !== today.getTime(),
      // Legacy fields for compatibility
      totalEarnings,
      withEps,
      withRevenue,
      sizeDistribution: transformedSizeDistribution,
      topGainers: transformedTopGainers,
      topLosers: transformedTopLosers,
      epsBeat: epsBeats[0] || null,
      revenueBeat: revenueBeats[0] || null,
      epsMiss: epsMisses[0] || null,
      revenueMiss: revenueMisses[0] || null
    };

    // Serialize BigInt values before sending
    const serializedStats = toJSONSafe(stats);

    return new Response(JSON.stringify({
      success: true,
      data: serializedStats,
      signature: { routeId: 'earnings/stats@v2' }
    }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
        'pragma': 'no-cache',
        'x-route-signature': 'earnings/stats@v2'
      }
    });
  } catch (error) {
    console.error('Error fetching earnings stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch earnings statistics',
    }, { status: 500 });
  }
}
