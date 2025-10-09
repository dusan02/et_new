import { logger } from './logger';

interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 5,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2
};

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === config.maxRetries) {
        logger.error(`Operation failed after ${config.maxRetries + 1} attempts`, {
          error: lastError.message,
          attempts: attempt + 1
        });
        throw lastError;
      }

      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelay
      );

      logger.warn(`Operation failed, retrying in ${delay}ms`, {
        attempt: attempt + 1,
        maxRetries: config.maxRetries,
        error: lastError.message,
        nextRetryIn: delay
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Batch retry with individual item retry
 */
export async function batchRetryWithBackoff<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  options: Partial<RetryOptions> = {}
): Promise<{ successful: R[]; failed: { item: T; error: Error }[] }> {
  const successful: R[] = [];
  const failed: { item: T; error: Error }[] = [];

  logger.info(`Starting batch operation for ${items.length} items`);

  for (const item of items) {
    try {
      const result = await retryWithBackoff(() => operation(item), options);
      successful.push(result);
    } catch (error) {
      failed.push({ item, error: error as Error });
      logger.error(`Failed to process item after all retries`, {
        item: typeof item === 'string' ? item : JSON.stringify(item),
        error: (error as Error).message
      });
    }
  }

  const successRate = (successful.length / items.length) * 100;
  logger.info(`Batch operation completed`, {
    total: items.length,
    successful: successful.length,
    failed: failed.length,
    successRate: `${successRate.toFixed(1)}%`
  });

  return { successful, failed };
}

/**
 * Log failed tickers to file for analysis
 */
export function logFailedTickers(
  failedTickers: { ticker: string; error: string }[],
  filename: string = 'marketdata-errors.log'
): void {
  if (failedTickers.length === 0) return;

  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    failedCount: failedTickers.length,
    failedTickers: failedTickers.map(f => ({
      ticker: f.ticker,
      error: f.error
    }))
  };

  // In production, this would write to a proper log file
  // For now, we'll use console logging
  logger.error(`Market data fetch failures logged`, {
    filename,
    failedCount: failedTickers.length,
    failedTickers: failedTickers.map(f => f.ticker)
  });

  // TODO: Implement actual file logging
  // fs.appendFileSync(filename, JSON.stringify(logEntry) + '\n');
}

/**
 * Check if success rate meets minimum threshold
 */
export function checkSuccessRate(
  successful: number,
  total: number,
  minThreshold: number = 70
): { meetsThreshold: boolean; rate: number; message: string } {
  const rate = (successful / total) * 100;
  const meetsThreshold = rate >= minThreshold;
  
  const message = meetsThreshold 
    ? `Success rate ${rate.toFixed(1)}% meets threshold of ${minThreshold}%`
    : `Success rate ${rate.toFixed(1)}% below threshold of ${minThreshold}%`;

  return { meetsThreshold, rate, message };
}
