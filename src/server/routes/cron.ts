import { Router } from 'express';
import { prisma } from '../app';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/cron/status - Get cron job status
router.get('/status', async (req, res) => {
  try {
    const heartbeats = await prisma.cronHeartbeat.findMany({
      orderBy: {
        lastRun: 'desc',
      },
    });

    const status = heartbeats.map(heartbeat => ({
      jobName: heartbeat.jobName,
      lastRun: heartbeat.lastRun,
      status: heartbeat.status,
      message: heartbeat.message,
      timeSinceLastRun: Date.now() - heartbeat.lastRun.getTime(),
    }));

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('Error fetching cron status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cron status',
    });
  }
});

// POST /api/cron/heartbeat - Update cron job heartbeat
router.post('/heartbeat', async (req, res) => {
  try {
    const { jobName, status, message } = req.body;

    if (!jobName) {
      return res.status(400).json({
        success: false,
        error: 'Job name is required',
      });
    }

    const heartbeat = await prisma.cronHeartbeat.upsert({
      where: { jobName },
      update: {
        lastRun: new Date(),
        status: status || 'success',
        message: message || null,
      },
      create: {
        jobName,
        lastRun: new Date(),
        status: status || 'success',
        message: message || null,
      },
    });

    res.json({
      success: true,
      data: heartbeat,
    });
  } catch (error) {
    logger.error('Error updating cron heartbeat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update cron heartbeat',
    });
  }
});

export { router as cronRoutes };
