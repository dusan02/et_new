// Redis client configuration
import { Redis } from '@upstash/redis';

// Mock Redis for development if not configured
export const redis = process.env.REDIS_URL ? new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN || '',
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

export default redis;