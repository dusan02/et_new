import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

const router = Router();

// GET /api/earnings/today - Get today's earnings data
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const earnings = await prisma.earningsTickersToday.findMany({
      where: {
        reportDate: today,
      },
      orderBy: {
        ticker: 'asc',
      },
    });

    const movements = await prisma.todayEarningsMovements.findMany({
      orderBy: {
        marketCapDiff: 'desc',
      },
    });

    // Combine data
    const combinedData = earnings.map(earning => {
      const movement = movements.find(m => m.ticker === earning.ticker);
      return {
        ...earning,
        movement,
      };
    });

    res.json({
      success: true,
      data: combinedData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching today\'s earnings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch earnings data',
    });
  }
});

// GET /api/earnings/ticker/:ticker - Get specific ticker data
router.get('/ticker/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    
    const earning = await prisma.earningsTickersToday.findFirst({
      where: {
        ticker: ticker.toUpperCase(),
        reportDate: new Date(),
      },
    });

    if (!earning) {
      return res.status(404).json({
        success: false,
        error: 'Ticker not found',
      });
    }

    res.json({
      success: true,
      data: earning,
    });
  } catch (error) {
    logger.error(`Error fetching ticker ${req.params.ticker}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ticker data',
    });
  }
});

// GET /api/earnings/stats - Get earnings statistics
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalEarnings,
      withEps,
      withRevenue,
      sizeDistribution,
      topGainers,
      topLosers,
    ] = await Promise.all([
      // Total earnings today
      prisma.earningsTickersToday.count({
        where: { reportDate: today },
      }),
      
      // With EPS data
      prisma.earningsTickersToday.count({
        where: {
          reportDate: today,
          epsActual: { not: null },
        },
      }),
      
      // With revenue data
      prisma.earningsTickersToday.count({
        where: {
          reportDate: today,
          revenueActual: { not: null },
        },
      }),
      
      // Size distribution
      prisma.todayEarningsMovements.groupBy({
        by: ['size'],
        _count: { size: true },
        _sum: { marketCap: true },
      }),
      
      // Top gainers
      prisma.todayEarningsMovements.findMany({
        take: 5,
        orderBy: { priceChangePercent: 'desc' },
        select: {
          ticker: true,
          companyName: true,
          priceChangePercent: true,
          marketCapDiffBillions: true,
        },
      }),
      
      // Top losers
      prisma.todayEarningsMovements.findMany({
        take: 5,
        orderBy: { priceChangePercent: 'asc' },
        select: {
          ticker: true,
          companyName: true,
          priceChangePercent: true,
          marketCapDiffBillions: true,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalEarnings,
        withEps,
        withRevenue,
        sizeDistribution,
        topGainers,
        topLosers,
      },
    });
  } catch (error) {
    logger.error('Error fetching earnings stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch earnings statistics',
    });
  }
});

export { router as earningsRoutes };
