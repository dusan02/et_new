// Silné typy pre cache + utility
export type CacheEntry<T> = {
  data: T;
  timestamp: number;   // ms od epochy
  ttlMs?: number;      // voliteľná expirácia
};

// Centrálna cache – ak nechceš singleton, exportni factory.
const cache = new Map<string, CacheEntry<unknown>>();

export function setCache<T>(key: string, data: T, ttlMs?: number): void {
  cache.set(key, { data, timestamp: Date.now(), ttlMs });
}

export function getCache<T>(key: string): CacheEntry<T> | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  return entry ?? null;
}

export function getCacheAgeMs(entry: Pick<CacheEntry<unknown>, "timestamp">): number {
  return Date.now() - entry.timestamp;
}

export function getCacheAgeSeconds(entry: Pick<CacheEntry<unknown>, "timestamp">): number {
  return Math.floor(getCacheAgeMs(entry) / 1000);
}

export function isExpired(entry: CacheEntry<unknown>): boolean {
  return entry.ttlMs !== undefined && getCacheAgeMs(entry) > entry.ttlMs;
}

// Backward compatibility aliases
export const getCachedData = getCache;
export const setCachedData = setCache;
export const getCacheAge = getCacheAgeSeconds;
export const clearCache = () => cache.clear();

// Príklad použitia v kóde:
// const cached = getCache<MyType>(key);
// if (cached && !isExpired(cached)) {
//   console.log(`[CACHE] HIT - age: ${getCacheAgeSeconds(cached)}s`);
//   return cached.data;
// }