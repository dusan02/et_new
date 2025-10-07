import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

const CACHE_VERSION_KEY = "cache:version";

/**
 * Cache versioning system to prevent serving stale data
 * Ensures frontend never gets old data after cache updates
 */

/**
 * Bump cache version (increment by 1)
 * Call this after successful data fetch and cache warmup
 */
export async function bumpCacheVersion(): Promise<number> {
  const newVersion = await redis.incr(CACHE_VERSION_KEY);
  console.log(`🔄 Cache version bumped to: ${newVersion}`);
  return newVersion;
}

/**
 * Get current cache version
 */
export async function getCacheVersion(): Promise<number> {
  const version = await redis.get(CACHE_VERSION_KEY);
  return version ? Number(version) : 1;
}

/**
 * Create namespaced cache key with version
 * Format: v{version}:{baseKey}
 */
export function namespacedKey(baseKey: string, version: number): string {
  return `v${version}:${baseKey}`;
}

/**
 * Create namespaced cache key with current version
 */
export async function getNamespacedKey(baseKey: string): Promise<string> {
  const version = await getCacheVersion();
  return namespacedKey(baseKey, version);
}

/**
 * Set cache value with versioned key
 */
export async function setCacheValue(
  baseKey: string, 
  value: any, 
  ttlSeconds?: number
): Promise<void> {
  const versionedKey = await getNamespacedKey(baseKey);
  
  if (ttlSeconds) {
    await redis.setex(versionedKey, ttlSeconds, JSON.stringify(value));
  } else {
    await redis.set(versionedKey, JSON.stringify(value));
  }
  
  console.log(`💾 Cached: ${versionedKey}`);
}

/**
 * Get cache value with versioned key
 */
export async function getCacheValue<T = any>(baseKey: string): Promise<T | null> {
  const versionedKey = await getNamespacedKey(baseKey);
  const value = await redis.get(versionedKey);
  
  if (!value) {
    return null;
  }
  
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error(`❌ Failed to parse cache value for ${versionedKey}:`, error);
    return null;
  }
}

/**
 * Delete cache value with versioned key
 */
export async function deleteCacheValue(baseKey: string): Promise<void> {
  const versionedKey = await getNamespacedKey(baseKey);
  await redis.del(versionedKey);
  console.log(`🗑️ Deleted cache: ${versionedKey}`);
}

/**
 * Set negative cache (for 404 responses)
 * Short TTL to avoid caching errors too long
 */
export async function setNegativeCache(
  baseKey: string, 
  errorCode: number, 
  ttlSeconds: number = 120
): Promise<void> {
  const versionedKey = await getNamespacedKey(baseKey);
  await redis.setex(versionedKey, ttlSeconds, JSON.stringify({ 
    error: true, 
    code: errorCode, 
    timestamp: new Date().toISOString() 
  }));
  console.log(`🚫 Negative cache set: ${versionedKey} (${errorCode}) for ${ttlSeconds}s`);
}

/**
 * Check if cache value is negative (error)
 */
export async function isNegativeCache(baseKey: string): Promise<boolean> {
  const value = await getCacheValue(baseKey);
  return value && typeof value === 'object' && 'error' in value;
}

/**
 * Clear all cache entries for a specific base key across all versions
 * Useful for manual cache invalidation
 */
export async function clearAllVersions(baseKey: string): Promise<void> {
  const pattern = `v*:${baseKey}`;
  const keys = await redis.keys(pattern);
  
  if (keys.length > 0) {
    await redis.del(...keys);
    console.log(`🗑️ Cleared ${keys.length} versions of cache: ${baseKey}`);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  currentVersion: number;
  totalKeys: number;
  versionedKeys: number;
  memoryUsage: string;
}> {
  const currentVersion = await getCacheVersion();
  const allKeys = await redis.keys('*');
  const versionedKeys = await redis.keys('v*:*');
  
  // Get memory usage (if available)
  let memoryUsage = 'N/A';
  try {
    const info = await redis.info('memory');
    const usedMemoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
    if (usedMemoryMatch) {
      memoryUsage = usedMemoryMatch[1];
    }
  } catch (error) {
    // Ignore memory info errors
  }
  
  return {
    currentVersion,
    totalKeys: allKeys.length,
    versionedKeys: versionedKeys.length,
    memoryUsage
  };
}

/**
 * Warm up critical cache entries
 * Call this after successful data fetch
 */
export async function warmCriticalCache(): Promise<void> {
  console.log('🔥 Warming up critical cache entries...');
  
  // Add your critical cache warming logic here
  // For example:
  // await setCacheValue('earnings:today', earningsData, 3600);
  // await setCacheValue('market:summary', marketSummary, 1800);
  
  console.log('✅ Critical cache warmed up');
}

/**
 * Cache versioning middleware for API responses
 */
export function withCacheVersioning<T>(
  baseKey: string,
  fetchFunction: () => Promise<T>,
  ttlSeconds: number = 3600
) {
  return async (): Promise<T> => {
    // Try to get from cache first
    const cached = await getCacheValue<T>(baseKey);
    if (cached) {
      console.log(`📦 Cache hit: ${baseKey}`);
      return cached;
    }
    
    // Check if it's a negative cache
    if (await isNegativeCache(baseKey)) {
      console.log(`🚫 Negative cache hit: ${baseKey}`);
      throw new Error('Cached error response');
    }
    
    // Fetch fresh data
    try {
      const data = await fetchFunction();
      await setCacheValue(baseKey, data, ttlSeconds);
      return data;
    } catch (error) {
      // Cache errors for short time
      if (error instanceof Error && error.message.includes('404')) {
        await setNegativeCache(baseKey, 404, 120);
      }
      throw error;
    }
  };
}
