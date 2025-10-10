/**
 * 🔒 Cron Lock Manager
 * Prevents parallel execution of cron jobs
 */

import Redis from 'ioredis';

export interface LockConfig {
  ttl: number; // Time to live in seconds
  retryDelay: number; // Retry delay in milliseconds
  maxRetries: number; // Maximum retry attempts
}

export class CronLockManager {
  private redis: Redis;
  private config: LockConfig;

  constructor(redisUrl?: string, config?: Partial<LockConfig>) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.config = {
      ttl: 300, // 5 minutes default
      retryDelay: 1000, // 1 second
      maxRetries: 3,
      ...config
    };
  }

  /**
   * Acquire lock for cron job
   */
  async acquireLock(jobName: string, jobId?: string): Promise<boolean> {
    const lockKey = `cron:lock:${jobName}`;
    const lockValue = jobId || `${Date.now()}-${Math.random()}`;
    
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        // Try to set lock with NX (only if not exists) and EX (expiration)
        const result = await this.redis.set(lockKey, lockValue, 'NX', 'EX', this.config.ttl);
        
        if (result === 'OK') {
          console.log(`[CRON][LOCK] Acquired lock for ${jobName} (${lockValue})`);
          return true;
        }

        // Lock exists, check if it's stale
        const currentValue = await this.redis.get(lockKey);
        if (currentValue) {
          console.log(`[CRON][LOCK] Lock exists for ${jobName} (${currentValue}), waiting...`);
        }

        // Wait before retry
        if (attempt < this.config.maxRetries - 1) {
          await this.delay(this.config.retryDelay);
        }
      } catch (error) {
        console.error(`[CRON][LOCK] Error acquiring lock for ${jobName}:`, error);
        if (attempt < this.config.maxRetries - 1) {
          await this.delay(this.config.retryDelay);
        }
      }
    }

    console.warn(`[CRON][LOCK] Failed to acquire lock for ${jobName} after ${this.config.maxRetries} attempts`);
    return false;
  }

  /**
   * Release lock for cron job
   */
  async releaseLock(jobName: string, jobId?: string): Promise<boolean> {
    const lockKey = `cron:lock:${jobName}`;
    
    try {
      if (jobId) {
        // Only release if we own the lock
        const script = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        const result = await this.redis.eval(script, 1, lockKey, jobId);
        return result === 1;
      } else {
        // Force release (use with caution)
        await this.redis.del(lockKey);
        console.log(`[CRON][LOCK] Force released lock for ${jobName}`);
        return true;
      }
    } catch (error) {
      console.error(`[CRON][LOCK] Error releasing lock for ${jobName}:`, error);
      return false;
    }
  }

  /**
   * Check if lock exists
   */
  async isLocked(jobName: string): Promise<boolean> {
    const lockKey = `cron:lock:${jobName}`;
    try {
      const exists = await this.redis.exists(lockKey);
      return exists === 1;
    } catch (error) {
      console.error(`[CRON][LOCK] Error checking lock for ${jobName}:`, error);
      return false;
    }
  }

  /**
   * Get lock info
   */
  async getLockInfo(jobName: string): Promise<{ value: string; ttl: number } | null> {
    const lockKey = `cron:lock:${jobName}`;
    try {
      const value = await this.redis.get(lockKey);
      const ttl = await this.redis.ttl(lockKey);
      
      if (value) {
        return { value, ttl };
      }
      return null;
    } catch (error) {
      console.error(`[CRON][LOCK] Error getting lock info for ${jobName}:`, error);
      return null;
    }
  }

  /**
   * Extend lock TTL
   */
  async extendLock(jobName: string, jobId: string, additionalTtl: number): Promise<boolean> {
    const lockKey = `cron:lock:${jobName}`;
    
    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("expire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;
      const result = await this.redis.eval(script, 1, lockKey, jobId, additionalTtl);
      return result === 1;
    } catch (error) {
      console.error(`[CRON][LOCK] Error extending lock for ${jobName}:`, error);
      return false;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Close connection
   */
  async close() {
    await this.redis.quit();
  }
}

// Global lock manager instance
export const cronLockManager = new CronLockManager();
