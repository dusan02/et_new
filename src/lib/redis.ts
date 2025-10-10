// Redis client configuration
import { Redis } from '@upstash/redis';

// Check if we have a valid Upstash Redis URL (HTTPS) or use mock
const isUpstashRedis = process.env.REDIS_URL && process.env.REDIS_URL.startsWith('https://');

// Mock Redis for development if not configured or not Upstash
export const redis = (isUpstashRedis && process.env.REDIS_TOKEN) ? new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
}) : {
  get: async (key: string) => {
    console.log(`[REDIS-MOCK] GET ${key}`);
    return null;
  },
  set: async (key: string, value: string, options?: any) => {
    console.log(`[REDIS-MOCK] SET ${key}: ${value.substring(0, 50)}... (EX: ${options?.EX || 'none'})`);
    return 'OK';
  },
  del: async (key: string) => {
    console.log(`[REDIS-MOCK] DEL ${key}`);
    return 1;
  },
  exists: async (key: string) => {
    console.log(`[REDIS-MOCK] EXISTS ${key}`);
    return 0;
  },
  expire: async (key: string, seconds: number) => {
    console.log(`[REDIS-MOCK] EXPIRE ${key} ${seconds}`);
    return 1;
  }
} as unknown as Redis;

// Helper functions for JSON operations
export async function getJSON(key: string): Promise<any> {
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value as string) : null;
  } catch (error) {
    console.error(`[REDIS] Error getting JSON for key ${key}:`, error);
    return null;
  }
}

export async function setJSON(key: string, value: any, options?: any): Promise<string> {
  try {
    const jsonValue = JSON.stringify(value);
    return await redis.set(key, jsonValue, options);
  } catch (error) {
    console.error(`[REDIS] Error setting JSON for key ${key}:`, error);
    return 'ERROR';
  }
}

export async function exists(key: string): Promise<number> {
  try {
    return await redis.exists(key);
  } catch (error) {
    console.error(`[REDIS] Error checking existence for key ${key}:`, error);
    return 0;
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('[REDIS] Connection test failed:', error);
    return false;
  }
}

export default redis;