export type NullableBigInt = bigint | null | undefined;

export function toBigIntOrNull(v: unknown): bigint | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'bigint') return v;
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return null;
    return BigInt(Math.round(v));
  }
  if (typeof v === 'string') {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return BigInt(Math.round(n));
  }
  return null;
}

/**
 * Ak potrebuješ škálovať desatinné čísla (napr. EPS na tisíciny):
 * toScaledBigInt(1.2345, 1000n) => 1235n
 */
export function toScaledBigInt(v: unknown, scale: bigint): bigint | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return BigInt(Math.round(n * Number(scale)));
}

export function pctDiff(actual: bigint | null, estimate: bigint | null): number | null {
  if (actual == null || estimate == null || estimate === 0n) return null;
  // zámerne do Number na „zobrazovacie" účely
  const a = Number(actual);
  const e = Number(estimate);
  if (!Number.isFinite(a) || !Number.isFinite(e) || e === 0) return null;
  return ((a - e) / e) * 100;
}
