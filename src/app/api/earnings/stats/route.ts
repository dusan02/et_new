import { NextRequest, NextResponse } from 'next/server';
import { serializeBigInts } from '@/lib/bigint-utils';
import { prisma } from '@/lib/prisma';
import { getTodayStart, getNYTimeString } from '@/lib/dates';
import { validateRequest, checkRateLimit, statsQuerySchema } from '@/lib/validation';

// Cache for 5 minutes
export const revalidate = 300
// Force dynamic rendering to avoid static generation issues with query parameters
export const dynamic = 'force-dynamic'

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

    // Fetch real stats from database
    const [
      totalEarnings,
      withEps,
      withRevenue,
      sizeDistribution,
      topGainers,
      topLosers,
      earningsWithActuals
    ] = await Promise.all([
      // Total earnings count
      prisma.earningsTickersToday.count({
        where: { reportDate: today }
      }),
      
      // Count with EPS data
      prisma.earningsTickersToday.count({
        where: { 
          reportDate: today,
          epsActual: { not: null }
        }
      }),
      
      // Count with revenue data
      prisma.earningsTickersToday.count({
        where: { 
          reportDate: today,
          revenueActual: { not: null }
        }
      }),
      
      // Size distribution - simplified approach
      prisma.todayEarningsMovements.findMany({
        where: { reportDate: today },
        select: {
          size: true,
          marketCap: true
        }
      }),
      
      // Top gainers
      prisma.todayEarningsMovements.findMany({
        where: { 
          reportDate: today,
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
      
      // Top losers
      prisma.todayEarningsMovements.findMany({
        where: { 
          reportDate: today,
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
      
      // All earnings with actual and estimate data
      prisma.earningsTickersToday.findMany({
        where: { 
          reportDate: today,
          epsActual: { not: null },
          epsEstimate: { not: null }
        },
        select: {
          ticker: true,
          epsActual: true,
          epsEstimate: true,
          revenueActual: true,
          revenueEstimate: true
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

    // Calculate beat/miss data
    const epsBeats = earningsWithActuals
      .filter(e => e.epsActual && e.epsEstimate && e.epsActual > e.epsEstimate)
      .sort((a, b) => (b.epsActual! - b.epsEstimate!) - (a.epsActual! - a.epsEstimate!));
    
    const epsMisses = earningsWithActuals
      .filter(e => e.epsActual && e.epsEstimate && e.epsActual < e.epsEstimate)
      .sort((a, b) => (a.epsActual! - a.epsEstimate!) - (b.epsActual! - b.epsEstimate!));
    
    const revenueBeats = earningsWithActuals
      .filter(e => e.revenueActual && e.revenueEstimate && e.revenueActual > e.revenueEstimate)
      .sort((a, b) => Number(b.revenueActual! - b.revenueEstimate!) - Number(a.revenueActual! - a.revenueEstimate!));
    
    const revenueMisses = earningsWithActuals
      .filter(e => e.revenueActual && e.revenueEstimate && e.revenueActual < e.revenueEstimate)
      .sort((a, b) => Number(a.revenueActual! - a.revenueEstimate!) - Number(b.revenueActual! - b.revenueEstimate!));

    // Get the most recent update time from the database
    const mostRecentEarnings = await prisma.earningsTickersToday.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true }
    });
    
    const mostRecentMarket = await prisma.todayEarningsMovements.findFirst({
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
      withBothActual: earningsWithActuals.filter(e => e.epsActual && e.revenueActual).length,
      withoutAnyActual: totalEarnings - earningsWithActuals.length,
      lastUpdated: lastUpdated.toISOString(),
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
    const serializedStats = serializeBigInts(stats);

    return NextResponse.json({
      success: true,
      data: serializedStats,
    });
  } catch (error) {
    console.error('Error fetching earnings stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch earnings statistics',
    }, { status: 500 });
  }
}
