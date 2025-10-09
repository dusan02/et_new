import { logger } from './logger';
import fs from 'fs';
import path from 'path';

// File-based Redis mock for persistence
class FileRedis {
  private dataPath: string;
  private data: Map<string, string> = new Map();

  constructor() {
    this.dataPath = path.join(process.cwd(), 'data', 'redis-mock.json');
    this.loadData();
  }

  private loadData(): void {
    try {
      if (fs.existsSync(this.dataPath)) {
        const fileData = fs.readFileSync(this.dataPath, 'utf8');
        const parsed = JSON.parse(fileData);
        this.data = new Map(Object.entries(parsed));
        logger.info(`Loaded ${this.data.size} keys from file Redis mock`);
      }
    } catch (error) {
      logger.warn('Failed to load file Redis mock data:', error);
    }
  }

  private saveData(): void {
    try {
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const dataObj = Object.fromEntries(this.data);
      fs.writeFileSync(this.dataPath, JSON.stringify(dataObj, null, 2));
    } catch (error) {
      logger.error('Failed to save file Redis mock data:', error);
    }
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  async get(key: string): Promise<string | null> {
    return this.data.get(key) || null;
  }

  async set(key: string, value: string): Promise<'OK'> {
    this.data.set(key, value);
    this.saveData();
    return 'OK';
  }

  async setex(key: string, ttl: number, value: string): Promise<'OK'> {
    this.data.set(key, value);
    this.saveData();
    // Note: TTL not implemented in file mock
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
      this.saveData();
    }
    return 'OK';
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.data.keys()).filter(key => regex.test(key));
  }

  async del(key: string): Promise<number> {
    const result = this.data.delete(key) ? 1 : 0;
    if (result) {
      this.saveData();
    }
    return result;
  }

  on(event: string, callback: (error?: any) => void): void {
    // Mock event handling
    if (event === 'connect') {
      setTimeout(() => callback(), 100);
    }
  }
}

let fileRedis: FileRedis | null = null;

export function initFileRedis(): FileRedis {
  if (fileRedis) return fileRedis;
  
  logger.info('Initializing File Redis for development');
  fileRedis = new FileRedis();
  
  return fileRedis;
}

export function getFileRedis(): FileRedis {
  if (!fileRedis) {
    return initFileRedis();
  }
  return fileRedis;
}

export async function getJSON<T>(key: string): Promise<T | null> {
  try {
    const client = getFileRedis();
    const value = await client.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    logger.error(`Failed to get JSON from File Redis key ${key}:`, error);
    throw error;
  }
}

export async function setJSON(key: string, value: unknown, ttlSec?: number): Promise<void> {
  try {
    const client = getFileRedis();
    const jsonValue = JSON.stringify(value);
    
    if (ttlSec) {
      await client.setex(key, ttlSec, jsonValue);
    } else {
      await client.set(key, jsonValue);
    }
  } catch (error) {
    logger.error(`Failed to set JSON in File Redis key ${key}:`, error);
    throw error;
  }
}

export async function renameKey(src: string, dest: string): Promise<void> {
  try {
    const client = getFileRedis();
    await client.rename(src, dest);
    logger.info(`Renamed File Redis key: ${src} → ${dest}`);
  } catch (error) {
    logger.error(`Failed to rename File Redis key ${src} to ${dest}:`, error);
    throw error;
  }
}

export async function exists(key: string): Promise<boolean> {
  try {
    const client = getFileRedis();
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    logger.error(`Failed to check existence of File Redis key ${key}:`, error);
    throw error;
  }
}

export async function getKeys(pattern: string): Promise<string[]> {
  try {
    const client = getFileRedis();
    return await client.keys(pattern);
  } catch (error) {
    logger.error(`Failed to get keys with pattern ${pattern}:`, error);
    throw error;
  }
}

export async function deleteKey(key: string): Promise<void> {
  try {
    const client = getFileRedis();
    await client.del(key);
  } catch (error) {
    logger.error(`Failed to delete File Redis key ${key}:`, error);
    throw error;
  }
}
