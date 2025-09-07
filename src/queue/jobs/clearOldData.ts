import { PrismaClient } from '@prisma/client';
import { logger } from '../../server/utils/logger';

const prisma = new PrismaClient();

export async function clearOldData() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep data for 7 days

    logger.info(`Clearing data older than ${cutoffDate.toISOString()}`);

    // Clear old earnings data
    const deletedEarnings = await prisma.earningsTickersToday.deleteMany({
      where: {
        reportDate: {
          lt: cutoffDate,
        },
      },
    });

    // Clear old market movements data
    const deletedMovements = await prisma.todayEarningsMovements.deleteMany({
      where: {
        updatedAt: {
          lt: cutoffDate,
        },
      },
    });

    // Clear old cron heartbeats (keep only last 30 days)
    const heartbeatCutoff = new Date();
    heartbeatCutoff.setDate(heartbeatCutoff.getDate() - 30);

    const deletedHeartbeats = await prisma.cronHeartbeat.deleteMany({
      where: {
        updatedAt: {
          lt: heartbeatCutoff,
        },
      },
    });

    const totalDeleted = deletedEarnings.count + deletedMovements.count + deletedHeartbeats.count;

    logger.info(`Cleanup completed: ${totalDeleted} records deleted`, {
      earnings: deletedEarnings.count,
      movements: deletedMovements.count,
      heartbeats: deletedHeartbeats.count,
    });

    return { 
      count: totalDeleted,
      details: {
        earnings: deletedEarnings.count,
        movements: deletedMovements.count,
        heartbeats: deletedHeartbeats.count,
      },
    };
  } catch (error) {
    logger.error('Error clearing old data:', error);
    throw error;
  }
}
