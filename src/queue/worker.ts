import Queue from 'bull';
import { PrismaClient } from '@prisma/client';
import { logger } from '../server/utils/logger';
import { fetchEarningsData } from './jobs/fetchEarningsData';
import { updateMarketData } from './jobs/updateMarketData';
import { clearOldData } from './jobs/clearOldData';
import { fetchBenzingaGuidance } from './jobs/fetchBenzingaGuidance';

const prisma = new PrismaClient();

// WebSocket client for emitting updates
let wsClient: any = null;

// Initialize WebSocket connection
const initWebSocket = () => {
  try {
    const { io } = require('socket.io-client');
    wsClient = io('http://localhost:3001', {
      transports: ['websocket'],
      timeout: 5000,
      retries: 3,
    });
    
    wsClient.on('connect', () => {
      logger.info('Queue worker connected to WebSocket server');
    });
    
    wsClient.on('disconnect', () => {
      logger.warn('Queue worker disconnected from WebSocket server');
    });
    
    wsClient.on('connect_error', (error: any) => {
      logger.error('WebSocket connection error:', error.message);
      // Retry connection after 5 seconds
      setTimeout(() => {
        if (!wsClient.connected) {
          logger.info('Retrying WebSocket connection...');
          wsClient.connect();
        }
      }, 5000);
    });
  } catch (error) {
    logger.error('Failed to initialize WebSocket client:', error);
  }
};

// Initialize WebSocket connection
initWebSocket();

// Create queues
const earningsQueue = new Queue('earnings-fetch', {
  redis: {
    host: process.env.QUEUE_REDIS_HOST || 'localhost',
    port: parseInt(process.env.QUEUE_REDIS_PORT || '6379'),
    password: process.env.QUEUE_REDIS_PASSWORD || undefined,
  },
});

const marketDataQueue = new Queue('market-data-update', {
  redis: {
    host: process.env.QUEUE_REDIS_HOST || 'localhost',
    port: parseInt(process.env.QUEUE_REDIS_PORT || '6379'),
    password: process.env.QUEUE_REDIS_PASSWORD || undefined,
  },
});

const guidanceQueue = new Queue('guidance-fetch', {
  redis: {
    host: process.env.QUEUE_REDIS_HOST || 'localhost',
    port: parseInt(process.env.QUEUE_REDIS_PORT || '6379'),
    password: process.env.QUEUE_REDIS_PASSWORD || undefined,
  },
});

const cleanupQueue = new Queue('cleanup', {
  redis: {
    host: process.env.QUEUE_REDIS_HOST || 'localhost',
    port: parseInt(process.env.QUEUE_REDIS_PORT || '6379'),
    password: process.env.QUEUE_REDIS_PASSWORD || undefined,
  },
});

// Process earnings fetch job
earningsQueue.process('fetch-earnings', async (job) => {
  try {
    logger.info('Starting earnings fetch job');
    
    const result = await fetchEarningsData();
    
    // Update heartbeat
    await prisma.cronHeartbeat.upsert({
      where: { jobName: 'fetch-earnings' },
      update: {
        lastRun: new Date(),
        status: 'success',
        message: `Fetched ${result.count} earnings records`,
      },
      create: {
        jobName: 'fetch-earnings',
        lastRun: new Date(),
        status: 'success',
        message: `Fetched ${result.count} earnings records`,
      },
    });

    // Emit real-time update
    if (wsClient && wsClient.connected) {
      wsClient.emit('earnings-updated', {
        timestamp: new Date().toISOString(),
        count: result.count,
      });
    }

    logger.info(`Earnings fetch job completed: ${result.count} records`);
    return result;
  } catch (error) {
    logger.error('Earnings fetch job failed:', error);
    
    // Update heartbeat with error
    await prisma.cronHeartbeat.upsert({
      where: { jobName: 'fetch-earnings' },
      update: {
        lastRun: new Date(),
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      create: {
        jobName: 'fetch-earnings',
        lastRun: new Date(),
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
});

// Process market data update job
marketDataQueue.process('update-market-data', async (job) => {
  try {
    logger.info('Starting market data update job');
    
    const result = await updateMarketData();
    
    // Update heartbeat
    await prisma.cronHeartbeat.upsert({
      where: { jobName: 'update-market-data' },
      update: {
        lastRun: new Date(),
        status: 'success',
        message: `Updated ${result.count} market data records`,
      },
      create: {
        jobName: 'update-market-data',
        lastRun: new Date(),
        status: 'success',
        message: `Updated ${result.count} market data records`,
      },
    });

    // Emit real-time update
    if (wsClient && wsClient.connected) {
      wsClient.emit('market-data-updated', {
        timestamp: new Date().toISOString(),
        count: result.count,
      });
    }

    logger.info(`Market data update job completed: ${result.count} records`);
    return result;
  } catch (error) {
    logger.error('Market data update job failed:', error);
    
    // Update heartbeat with error
    await prisma.cronHeartbeat.upsert({
      where: { jobName: 'update-market-data' },
      update: {
        lastRun: new Date(),
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      create: {
        jobName: 'update-market-data',
        lastRun: new Date(),
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
});

// Process guidance fetch job
guidanceQueue.process('fetch-guidance', async (job) => {
  try {
    logger.info('Starting Benzinga guidance fetch job');
    
    const result = await fetchBenzingaGuidance();
    
    // Update heartbeat
    await prisma.cronHeartbeat.upsert({
      where: { jobName: 'fetch-guidance' },
      update: {
        lastRun: new Date(),
        status: 'success',
        message: `Fetched ${result.count} guidance records`,
      },
      create: {
        jobName: 'fetch-guidance',
        lastRun: new Date(),
        status: 'success',
        message: `Fetched ${result.count} guidance records`,
      },
    });

    // Emit real-time update
    if (wsClient && wsClient.connected) {
      wsClient.emit('guidance-updated', {
        timestamp: new Date().toISOString(),
        count: result.count,
      });
    }

    logger.info(`Guidance fetch job completed: ${result.count} records`);
    return result;
  } catch (error) {
    logger.error('Guidance fetch job failed:', error);
    
    // Update heartbeat with error
    await prisma.cronHeartbeat.upsert({
      where: { jobName: 'fetch-guidance' },
      update: {
        lastRun: new Date(),
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      create: {
        jobName: 'fetch-guidance',
        lastRun: new Date(),
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
});

// Process cleanup job
cleanupQueue.process('cleanup-old-data', async (job) => {
  try {
    logger.info('Starting cleanup job');
    
    const result = await clearOldData();
    
    // Update heartbeat
    await prisma.cronHeartbeat.upsert({
      where: { jobName: 'cleanup-old-data' },
      update: {
        lastRun: new Date(),
        status: 'success',
        message: `Cleaned up ${result.count} old records`,
      },
      create: {
        jobName: 'cleanup-old-data',
        lastRun: new Date(),
        status: 'success',
        message: `Cleaned up ${result.count} old records`,
      },
    });

    logger.info(`Cleanup job completed: ${result.count} records removed`);
    return result;
  } catch (error) {
    logger.error('Cleanup job failed:', error);
    
    // Update heartbeat with error
    await prisma.cronHeartbeat.upsert({
      where: { jobName: 'cleanup-old-data' },
      update: {
        lastRun: new Date(),
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      create: {
        jobName: 'cleanup-old-data',
        lastRun: new Date(),
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
});

// Schedule recurring jobs
earningsQueue.add('fetch-earnings', {}, {
  repeat: { cron: '*/2 * * * *' }, // Every 2 minutes
  removeOnComplete: 10,
  removeOnFail: 5,
});

marketDataQueue.add('update-market-data', {}, {
  repeat: { cron: '* * * * *' }, // Every minute - UNLIMITED API calls!
  removeOnComplete: 10,
  removeOnFail: 5,
});

guidanceQueue.add('fetch-guidance', {}, {
  repeat: { cron: '* * * * *' }, // Every minute
  removeOnComplete: 10,
  removeOnFail: 5,
});

cleanupQueue.add('cleanup-old-data', {}, {
  repeat: { cron: '0 0 * * *' }, // Daily at midnight
  removeOnComplete: 5,
  removeOnFail: 3,
});

logger.info('Queue worker started with scheduled jobs');

export { earningsQueue, marketDataQueue, guidanceQueue, cleanupQueue };
