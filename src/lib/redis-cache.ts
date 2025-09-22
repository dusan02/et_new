// Redis caching implementation for production performance
import Redis from 'ioredis';

let redis: Redis | null = null;

// Initialize Redis connection
export function getRedisClient() {
  if (!redis && process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    
    redis.on('connect', () => {
      console.log('[REDIS] Connected successfully');
    });
    
    redis.on('error', (err) => {
      console.error('[REDIS] Connection error:', err);
    });
  }
  
  return redis;
}

// Cache utilities with Redis fallback to memory
export class CacheManager {
  private static memoryCache = new Map<string, { data: any; timestamp: number }>();
  private static MEMORY_TTL = 5 * 60 * 1000; // 5 minutes
  private static REDIS_TTL = 15 * 60; // 15 minutes

  static async get(key: string): Promise<any> {
    try {
      const redis = getRedisClient();
      
      if (redis) {
        const cached = await redis.get(key);
        if (cached) {
          console.log(`[REDIS] Cache HIT for ${key}`);
          return JSON.parse(cached);
        }
      }
      
      // Fallback to memory cache
      const memoryCached = this.memoryCache.get(key);
      if (memoryCached && (Date.now() - memoryCached.timestamp) < this.MEMORY_TTL) {
        console.log(`[MEMORY] Cache HIT for ${key}`);
        return memoryCached.data;
      }
      
      return null;
    } catch (error) {
      console.error('[CACHE] Get error:', error);
      return null;
    }
  }

  static async set(key: string, data: any): Promise<void> {
    try {
      const redis = getRedisClient();
      
      if (redis) {
        await redis.setex(key, this.REDIS_TTL, JSON.stringify(data));
        console.log(`[REDIS] Cache SET for ${key}`);
      }
      
      // Always set in memory cache as fallback
      this.memoryCache.set(key, {
        data,
        timestamp: Date.now()
      });
      console.log(`[MEMORY] Cache SET for ${key}`);
    } catch (error) {
      console.error('[CACHE] Set error:', error);
    }
  }

  static async invalidate(pattern: string): Promise<void> {
    try {
      const redis = getRedisClient();
      
      if (redis) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
          console.log(`[REDIS] Invalidated ${keys.length} keys for pattern: ${pattern}`);
        }
      }
      
      // Clear memory cache
      const keys = Array.from(this.memoryCache.keys());
      for (const key of keys) {
        if (key.includes(pattern.replace('*', ''))) {
          this.memoryCache.delete(key);
        }
      }
      console.log(`[MEMORY] Invalidated cache for pattern: ${pattern}`);
    } catch (error) {
      console.error('[CACHE] Invalidate error:', error);
    }
  }
}
