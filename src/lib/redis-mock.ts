import { logger } from './logger';

// Mock Redis implementation for development/testing
class MockRedis {
  private data: Map<string, string> = new Map();

  async ping(): Promise<string> {
    return 'PONG';
  }

  async get(key: string): Promise<string | null> {
    return this.data.get(key) || null;
  }

  async set(key: string, value: string): Promise<'OK'> {
    this.data.set(key, value);
    return 'OK';
  }

  async setex(key: string, ttl: number, value: string): Promise<'OK'> {
    this.data.set(key, value);
    // Note: TTL not implemented in mock
    return 'OK';
  }

  async exists(key: string): Promise<number> {
    return this.data.has(key) ? 1 : 0;
  }

  async rename(src: string, dest: string): Promise<'OK'> {
    const value = this.data.get(src);
    if (value) {
      this.data.set(dest, value);
      this.data.delete(src);
    }
    return 'OK';
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.data.keys()).filter(key => regex.test(key));
  }

  async del(key: string): Promise<number> {
    return this.data.delete(key) ? 1 : 0;
  }

  on(event: string, callback: (error?: any) => void): void {
    // Mock event handling
    if (event === 'connect') {
      setTimeout(() => callback(), 100);
    }
  }
}

let mockRedis: MockRedis | null = null;

export function initRedis(): MockRedis {
  if (mockRedis) return mockRedis;
  
  logger.info('Initializing Mock Redis for development');
  mockRedis = new MockRedis();
  
  return mockRedis;
}

export function getRedis(): MockRedis {
  if (!mockRedis) {
    return initRedis();
  }
  return mockRedis;
}

export async function getJSON<T>(key: string): Promise<T | null> {
  try {
    const client = getRedis();
    const value = await client.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    logger.error(`Failed to get JSON from Mock Redis key ${key}:`, error);
    throw error;
  }
}

export async function setJSON(key: string, value: unknown, ttlSec?: number): Promise<void> {
  try {
    const client = getRedis();
    const jsonValue = JSON.stringify(value);
    
    if (ttlSec) {
      await client.setex(key, ttlSec, jsonValue);
    } else {
      await client.set(key, jsonValue);
    }
  } catch (error) {
    logger.error(`Failed to set JSON in Mock Redis key ${key}:`, error);
    throw error;
  }
}

export async function renameKey(src: string, dest: string): Promise<void> {
  try {
    const client = getRedis();
    await client.rename(src, dest);
    logger.info(`Renamed Mock Redis key: ${src} → ${dest}`);
  } catch (error) {
    logger.error(`Failed to rename Mock Redis key ${src} to ${dest}:`, error);
    throw error;
  }
}

export async function exists(key: string): Promise<boolean> {
  try {
    const client = getRedis();
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    logger.error(`Failed to check existence of Mock Redis key ${key}:`, error);
    throw error;
  }
}

export async function getKeys(pattern: string): Promise<string[]> {
  try {
    const client = getRedis();
    return await client.keys(pattern);
  } catch (error) {
    logger.error(`Failed to get keys with pattern ${pattern}:`, error);
    throw error;
  }
}

export async function deleteKey(key: string): Promise<void> {
  try {
    const client = getRedis();
    await client.del(key);
  } catch (error) {
    logger.error(`Failed to delete Mock Redis key ${key}:`, error);
    throw error;
  }
}
