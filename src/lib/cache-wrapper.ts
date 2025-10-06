/**
 * Cache wrapper with TTL and nocache bypass support
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

// In-memory cache (for development)
const memoryCache = new Map<string, CacheEntry<any>>()

/**
 * Generate cache key with versioning
 */
export function getCacheKey(ticker: string, part: string, version: string = 'v1'): string {
  return `market:${ticker}:${part}:${version}`
}

/**
 * Get cached data with TTL check
 */
export function getCachedData<T>(key: string): CacheEntry<T> | null {
  const entry = memoryCache.get(key)
  if (!entry) return null
  
  const age = (Date.now() - entry.timestamp) / 1000
  if (age > entry.ttl) {
    memoryCache.delete(key)
    return null
  }
  
  return entry
}

/**
 * Set cached data with TTL
 */
export function setCachedData<T>(key: string, data: T, ttl: number = 300): void {
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  })
}

/**
 * Clear cache by pattern
 */
export function clearCachePattern(pattern: string): number {
  let cleared = 0
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key)
      cleared++
    }
  }
  return cleared
}

/**
 * Clear all cache
 */
export function clearAllCache(): number {
  const size = memoryCache.size
  memoryCache.clear()
  return size
}

/**
 * Get cache age in seconds
 */
export function getCacheAge<T>(entry: CacheEntry<T>): number {
  return Math.floor((Date.now() - entry.timestamp) / 1000)
}

/**
 * Cache wrapper with fetcher function
 */
export async function getWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300,
  noCache: boolean = false
): Promise<{ data: T; fromCache: boolean; age?: number }> {
  if (noCache) {
    const fresh = await fetcher()
    return { data: fresh, fromCache: false }
  }
  
  const cached = getCachedData<T>(key)
  if (cached) {
    return { 
      data: cached.data, 
      fromCache: true, 
      age: getCacheAge(cached) 
    }
  }
  
  const fresh = await fetcher()
  setCachedData(key, fresh, ttl)
  return { data: fresh, fromCache: false }
}
