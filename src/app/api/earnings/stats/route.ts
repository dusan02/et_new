import { NextRequest, NextResponse } from 'next/server';
import { toJSONSafe } from '@/modules/shared';
import { prisma } from '@/lib/prisma';
import { getTodayStart, getNYTimeString } from '@/modules/shared';
import { validateRequest, checkRateLimit, statsQuerySchema } from '@/lib/validation';
import { getJSON } from '@/lib/redis';

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

    // Try to get published data from Redis first
    const publishedKey = `earnings:${today.toISOString().split('T')[0]}:published`;
    const publishedData = await getJSON(publishedKey);
    
    if (publishedData && publishedData.data && publishedData.data.length > 0) {
      console.log(`[STATS] Using published data from Redis: ${publishedData.data.length} records`);
      
      // Calculate stats from published data
      const stats = calculateStatsFromPublishedData(publishedData.data);
      
      return new Response(JSON.stringify({
        success: true,
        data: toJSONSafe(stats),
        signature: { routeId: 'earnings/stats@v3' }
      }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
          'pragma': 'no-cache',
          'x-route-signature': 'earnings/stats@v3'
        }
      });
    }

    // Fallback to database if no published data
    console.log(`[STATS] No published data found, falling back to database`);
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
    
    console.log('[STATS DEBUG] Revenue beats count:', revenueBeats.length);
    if (revenueBeats.length > 0) {
      console.log('[STATS DEBUG] Top revenue beat:', revenueBeats[0]);
    }
    
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

function calculateStatsFromPublishedData(data: any[]) {
  console.log(`[STATS] Calculating stats from ${data.length} published records`);
  
  // Filter records with market cap data
  const recordsWithMarketCap = data.filter(item => item.market_cap && item.market_cap > 0);
  
  // Calculate size distribution
  const sizeGroups = new Map();
  recordsWithMarketCap.forEach(item => {
    const size = item.size || 'Unknown';
    if (!sizeGroups.has(size)) {
      sizeGroups.set(size, { count: 0, totalMarketCap: 0 });
    }
    sizeGroups.get(size).count++;
    sizeGroups.get(size).totalMarketCap += Number(item.market_cap);
  });

  const transformedSizeDistribution = Array.from(sizeGroups.entries()).map(([size, data]) => ({
    size,
    _count: { size: data.count },
    _sum: { marketCap: data.totalMarketCap }
  }));

  // Calculate top gainers/losers by price
  const priceGainers = data
    .filter(item => item.price_change_percent !== null && item.price_change_percent !== undefined)
    .sort((a, b) => b.price_change_percent - a.price_change_percent)
    .slice(0, 5)
    .map(item => ({
      ticker: item.ticker,
      companyName: item.name,
      priceChangePercent: item.price_change_percent,
      marketCapDiffBillions: item.marketCapDiffBillions
    }));

  const priceLosers = data
    .filter(item => item.price_change_percent !== null && item.price_change_percent !== undefined)
    .sort((a, b) => a.price_change_percent - b.price_change_percent)
    .slice(0, 5)
    .map(item => ({
      ticker: item.ticker,
      companyName: item.name,
      priceChangePercent: item.price_change_percent,
      marketCapDiffBillions: item.marketCapDiffBillions
    }));

  // Calculate EPS and Revenue beats/misses
  const earningsWithActuals = data.filter(item => 
    (item.eps_act !== null && item.eps_est !== null) || 
    (item.rev_act !== null && item.rev_est !== null)
  );

  const epsBeats = earningsWithActuals
    .filter(e => e.eps_act && e.eps_est && e.eps_act > e.eps_est)
    .sort((a, b) => (b.eps_act - b.eps_est) - (a.eps_act - a.eps_est));
  
  const epsMisses = earningsWithActuals
    .filter(e => e.eps_act && e.eps_est && e.eps_act < e.eps_est)
    .sort((a, b) => (a.eps_act - a.eps_est) - (b.eps_act - b.eps_est));
  
  const revenueBeats = earningsWithActuals
    .filter(e => e.rev_act && e.rev_est && e.rev_act > e.rev_est)
    .sort((a, b) => (b.rev_act - b.rev_est) - (a.rev_act - a.rev_est));
  
  const revenueMisses = earningsWithActuals
    .filter(e => e.rev_act && e.rev_est && e.rev_act < e.rev_est)
    .sort((a, b) => (a.rev_act - a.rev_est) - (b.rev_act - b.rev_est));

  console.log(`[STATS DEBUG] Revenue beats count: ${revenueBeats.length}`);
  if (revenueBeats.length > 0) {
    console.log(`[STATS DEBUG] Top revenue beat:`, revenueBeats[0]);
  }

  const totalMarketCap = recordsWithMarketCap.reduce((sum, item) => sum + Number(item.market_cap), 0);

  return {
    totalCompanies: recordsWithMarketCap.length,
    withEpsActual: earningsWithActuals.filter(e => e.eps_act !== null).length,
    withRevenueActual: earningsWithActuals.filter(e => e.rev_act !== null).length,
    withBothActual: earningsWithActuals.filter(e => e.eps_act !== null && e.rev_act !== null).length,
    withoutAnyActual: recordsWithMarketCap.length - earningsWithActuals.length,
    lastUpdated: new Date().toISOString(),
    requestedDate: new Date().toISOString().split('T')[0],
    actualDate: new Date().toISOString().split('T')[0],
    fallbackUsed: false,
    // Legacy fields for compatibility
    totalEarnings: recordsWithMarketCap.length,
    withEps: earningsWithActuals.filter(e => e.eps_act !== null).length,
    withRevenue: earningsWithActuals.filter(e => e.rev_act !== null).length,
    sizeDistribution: transformedSizeDistribution,
    topGainers: priceGainers,
    topLosers: priceLosers,
    epsBeat: epsBeats[0] ? { ticker: epsBeats[0].ticker, epsActual: epsBeats[0].eps_act, epsEstimate: epsBeats[0].eps_est } : null,
    revenueBeat: revenueBeats[0] ? { ticker: revenueBeats[0].ticker, revenueActual: BigInt(revenueBeats[0].rev_act), revenueEstimate: BigInt(revenueBeats[0].rev_est) } : null,
    epsMiss: epsMisses[0] ? { ticker: epsMisses[0].ticker, epsActual: epsMisses[0].eps_act, epsEstimate: epsMisses[0].eps_est } : null,
    revenueMiss: revenueMisses[0] ? { ticker: revenueMisses[0].ticker, revenueActual: BigInt(revenueMisses[0].rev_act), revenueEstimate: BigInt(revenueMisses[0].rev_est) } : null
  };
}
