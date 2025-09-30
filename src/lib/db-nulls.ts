// src/lib/db-nulls.ts
export function nul<T>(v: T | undefined | null): T | null {
  return v ?? null; // pozor: nie v || null
}
