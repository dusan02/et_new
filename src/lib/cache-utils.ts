// Cache utilities for API routes

// Simple in-memory cache
const apiCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 1 * 60 * 1000 // 1 minute (reduced for testing)

// Function to clear cache
export function clearCache() {
  apiCache.clear()
  console.log('[CACHE] Cleared all cached data')
}

// Function to get cached data
export function getCachedData(key: string) {
  const cached = apiCache.get(key)
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached
  }
  return null
}

// Function to set cached data
export function setCachedData(key: string, data: any) {
  apiCache.set(key, {
    data,
    timestamp: Date.now()
  })
}

// Function to get cache age
export function getCacheAge(timestamp: number) {
  return Math.round((Date.now() - timestamp) / 1000)
}
