import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

/**
 * Distributed lock using Redis SET with NX and EX options
 * Prevents multiple instances from running the same operation simultaneously
 */
export async function withLock(
  key: string, 
  ttlSec: number, 
  fn: () => Promise<void>
): Promise<boolean> {
  const token = `${Date.now()}-${Math.random()}`;
  
  // Try to acquire lock
  const ok = await redis.set(key, token, "NX", "EX", ttlSec);
  
  if (!ok) {
    console.log(`🔒 Lock ${key} already held by another process`);
    return false; // Already running in another process
  }
  
  console.log(`🔒 Acquired lock ${key} (TTL: ${ttlSec}s)`);
  
  try {
    await fn();
    return true;
  } finally {
    // Only release if we still own the lock
    const current = await redis.get(key);
    if (current === token) {
      await redis.del(key);
      console.log(`🔓 Released lock ${key}`);
    }
  }
}

/**
 * Check if a lock is currently held
 */
export async function isLocked(key: string): Promise<boolean> {
  const exists = await redis.exists(key);
  return exists === 1;
}

/**
 * Get lock info (TTL and value)
 */
export async function getLockInfo(key: string): Promise<{ ttl: number; value: string | null } | null> {
  const value = await redis.get(key);
  if (!value) return null;
  
  const ttl = await redis.ttl(key);
  return { ttl, value };
}

/**
 * Force release a lock (use with caution)
 */
export async function forceReleaseLock(key: string): Promise<void> {
  await redis.del(key);
  console.log(`🔓 Force released lock ${key}`);
}
