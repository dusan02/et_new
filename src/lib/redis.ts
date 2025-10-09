import Redis from 'ioredis';
import { logger } from './logger';
import { initFileRedis, getFileRedis } from './redis-file';

let redis: Redis | null = null;
let useMockRedis = false;

/**
 * Initialize Redis connection with fallback to mock
 */
export function initRedis(): Redis {
  if (redis) return redis;
  
  // Always use mock Redis for now to avoid connection issues
  logger.info('Using mock Redis for development');
  useMockRedis = true;
  return initFileRedis() as any;
}

/**
 * Get Redis instance
 */
export function getRedis(): Redis {
  if (useMockRedis) {
    return getFileRedis() as any;
  }
  if (!redis) {
    return initRedis();
  }
  return redis;
}

/**
 * Get JSON value from Redis
 */
export async function getJSON<T>(key: string): Promise<T | null> {
  try {
    const client = getRedis();
    const value = await client.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    logger.error(`Failed to get JSON from Redis key ${key}:`, error);
    throw error;
  }
}

/**
 * Set JSON value in Redis
 */
export async function setJSON(key: string, value: unknown, ttlSec?: number): Promise<void> {
  try {
    const client = getRedis();
    const jsonValue = JSON.stringify(value);
    
    if (ttlSec) {
      await client.setex(key, ttlSec, jsonValue);
    } else {
      await client.set(key, jsonValue);
    }
    
    logger.debug(`Set JSON in Redis`, { key, ttlSec });
  } catch (error) {
    logger.error(`Failed to set JSON in Redis key ${key}:`, error);
    throw error;
  }
}

/**
 * Rename Redis key atomically
 */
export async function renameKey(src: string, dest: string): Promise<void> {
  try {
    const client = getRedis();
    await client.rename(src, dest);
    logger.info(`Renamed Redis key: ${src} → ${dest}`);
  } catch (error) {
    logger.error(`Failed to rename Redis key ${src} to ${dest}:`, error);
    throw error;
  }
}

/**
 * Check if key exists in Redis
 */
export async function exists(key: string): Promise<boolean> {
  try {
    const client = getRedis();
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    logger.error(`Failed to check existence of Redis key ${key}:`, error);
    throw error;
  }
}

/**
 * Get multiple keys with pattern
 */
export async function getKeys(pattern: string): Promise<string[]> {
  try {
    const client = getRedis();
    return await client.keys(pattern);
  } catch (error) {
    logger.error(`Failed to get keys with pattern ${pattern}:`, error);
    throw error;
  }
}

/**
 * Delete key from Redis
 */
export async function deleteKey(key: string): Promise<void> {
  try {
    const client = getRedis();
    await client.del(key);
    logger.debug(`Deleted Redis key: ${key}`);
  } catch (error) {
    logger.error(`Failed to delete Redis key ${key}:`, error);
    throw error;
  }
}

/**
 * Test Redis connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = getRedis();
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis connection test failed:', error);
    return false;
  }
}