/**
 * 🔄 Atomic Redis Operations
 * Safe atomic operations for data consistency
 */

import Redis from 'ioredis';

export class AtomicRedisManager {
  private redis: Redis;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Atomic swap operation to avoid mixing old/new data
   */
  async atomicSwap(key: string, newData: any, ttlSeconds: number = 900) {
    const tempKey = `${key}:next`;
    const finalKey = key;

    try {
      // 1. Write new data to temporary key
      await this.redis.set(tempKey, JSON.stringify(newData), 'EX', ttlSeconds);
      
      // 2. Atomically rename temp key to final key
      await this.redis.rename(tempKey, finalKey);
      
      console.log(`[REDIS][ATOMIC] Swapped ${key} with ${JSON.stringify(newData).length} bytes`);
      
      return true;
    } catch (error) {
      console.error(`[REDIS][ATOMIC] Failed to swap ${key}:`, error);
      
      // Cleanup temp key if it exists
      await this.redis.del(tempKey);
      
      return false;
    }
  }

  /**
   * Get data with fallback to previous version
   */
  async getWithFallback(key: string, fallbackKey?: string) {
    try {
      const data = await this.redis.get(key);
      if (data) {
        return JSON.parse(data);
      }

      // Try fallback key if provided
      if (fallbackKey) {
        const fallbackData = await this.redis.get(fallbackKey);
        if (fallbackData) {
          console.log(`[REDIS][FALLBACK] Using ${fallbackKey} for ${key}`);
          return JSON.parse(fallbackData);
        }
      }

      return null;
    } catch (error) {
      console.error(`[REDIS][GET] Failed to get ${key}:`, error);
      return null;
    }
  }

  /**
   * Set data with atomic backup
   */
  async setWithBackup(key: string, data: any, ttlSeconds: number = 900) {
    const backupKey = `${key}:backup`;
    
    try {
      // 1. Backup current data
      const currentData = await this.redis.get(key);
      if (currentData) {
        await this.redis.set(backupKey, currentData, 'EX', ttlSeconds * 2);
      }

      // 2. Set new data
      await this.redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
      
      console.log(`[REDIS][BACKUP] Set ${key} with backup at ${backupKey}`);
      
      return true;
    } catch (error) {
      console.error(`[REDIS][BACKUP] Failed to set ${key}:`, error);
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG';
    } catch (error) {
      console.error('[REDIS][HEALTH] Failed:', error);
      return false;
    }
  }

  /**
   * Close connection
   */
  async close() {
    await this.redis.quit();
  }
}

// Global Redis manager instance
export const redisManager = new AtomicRedisManager();
