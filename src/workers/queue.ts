import { Queue } from 'bullmq';
import { initRedis } from '@/lib/redis';
import { logger } from '@/lib/logger';

const connection = initRedis();

// Prices queue
export const pricesQueue = new Queue('q-prices', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // 1s, 5s, 15s
    },
  },
});

// Queue event handlers
pricesQueue.on('completed', (job) => {
  logger.info('Prices job completed', {
    jobId: job.id,
    tickers: job.data.tickers?.length || 0,
    day: job.data.day,
  });
});

pricesQueue.on('failed', (job, err) => {
  logger.error('Prices job failed', {
    jobId: job.id,
    tickers: job.data.tickers?.length || 0,
    day: job.data.day,
    error: err.message,
  });
});

pricesQueue.on('stalled', (job) => {
  logger.warn('Prices job stalled', {
    jobId: job.id,
    tickers: job.data.tickers?.length || 0,
    day: job.data.day,
  });
});

// Cleanup function
export async function closeQueues() {
  await pricesQueue.close();
  logger.info('All queues closed');
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, closing queues...');
  await closeQueues();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing queues...');
  await closeQueues();
  process.exit(0);
});
