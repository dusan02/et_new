/**
 * Fallback Redis lock implementation for when Redis is not available
 * Uses in-memory locks as fallback
 */

let inMemoryLocks = new Map<string, { token: string; expires: number }>();

export interface LockResult {
  acquired: boolean;
  token?: string;
}

export async function acquireLock(key: string, ttlSec: number = 1200): Promise<LockResult> {
  const now = Date.now();
  const expires = now + (ttlSec * 1000);
  
  // Clean up expired locks
  for (const [lockKey, lockData] of inMemoryLocks.entries()) {
    if (lockData.expires < now) {
      inMemoryLocks.delete(lockKey);
    }
  }
  
  // Check if lock already exists
  if (inMemoryLocks.has(key)) {
    const existingLock = inMemoryLocks.get(key)!;
    if (existingLock.expires > now) {
      console.log(`🔒 Lock ${key} already held (in-memory fallback)`);
      return { acquired: false };
    }
  }
  
  // Acquire lock
  const token = `${now}-${Math.random()}`;
  inMemoryLocks.set(key, { token, expires });
  
  console.log(`🔒 Lock acquired: ${key} (in-memory fallback, TTL: ${ttlSec}s)`);
  return { acquired: true, token };
}

export async function releaseLock(key: string, token: string): Promise<boolean> {
  const lockData = inMemoryLocks.get(key);
  
  if (!lockData || lockData.token !== token) {
    console.log(`⚠️ Lock release failed (token mismatch): ${key}`);
    return false;
  }
  
  inMemoryLocks.delete(key);
  console.log(`🔓 Lock released: ${key} (in-memory fallback)`);
  return true;
}

export async function withLock(key: string, ttlSec: number, fn: () => Promise<void>): Promise<boolean> {
  const lock = await acquireLock(key, ttlSec);
  if (!lock.acquired) return false;
  
  try {
    await fn();
    return true;
  } finally {
    await releaseLock(key, lock.token!);
  }
}

export function getBootstrapLockKey(date: Date): string {
  const dateStr = date.toISOString().split('T')[0];
  return `lock:bootstrap:${dateStr}`;
}

export async function isLocked(key: string): Promise<boolean> {
  const now = Date.now();
  const lockData = inMemoryLocks.get(key);
  
  if (!lockData) return false;
  
  if (lockData.expires < now) {
    inMemoryLocks.delete(key);
    return false;
  }
  
  return true;
}
