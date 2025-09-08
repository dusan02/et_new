import { NextResponse } from 'next/server';
import { serializeBigInts } from '@/lib/bigint-utils';
import { prisma } from '@/lib/prisma';
import { getTodayStart } from '@/lib/dates';

export async function GET() {
  try {
    // Use today's date since we have real data for 2025-09-08
    const today = new Date('2025-09-08');

    // Fetch real stats from database
    const [
      totalEarnings,
      withEps,
      withRevenue,
      sizeDistribution,
      topGainers,
      topLosers,
      epsBeats,
      revenueBeats
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
      
      // EPS guidance (companies with EPS guidance data)
      prisma.benzingaGuidance.findFirst({
        where: { 
          estimatedEpsGuidance: { not: null }
        },
        orderBy: { lastUpdated: 'desc' },
        select: {
          ticker: true,
          estimatedEpsGuidance: true,
          lastUpdated: true
        }
      }),
      
      // Revenue guidance (companies with revenue guidance data)
      prisma.benzingaGuidance.findFirst({
        where: { 
          estimatedRevenueGuidance: { not: null }
        },
        orderBy: { lastUpdated: 'desc' },
        select: {
          ticker: true,
          estimatedRevenueGuidance: true,
          lastUpdated: true
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

    const stats = {
      totalEarnings,
      withEps,
      withRevenue,
      sizeDistribution: transformedSizeDistribution,
      topGainers: transformedTopGainers,
      topLosers: transformedTopLosers,
      epsGuidance: epsBeats[0] || null,
      revenueGuidance: revenueBeats[0] || null
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
