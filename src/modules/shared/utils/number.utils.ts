/**
 * 🔧 SHARED MODULE - Number Utilities
 * Helper functions for number and BigInt handling
 */

export type NullableBigInt = bigint | null | undefined;

/**
 * Convert value to BigInt safely
 * @param v - Value to convert
 * @returns BigInt or null
 */
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
 * Convert value to scaled BigInt (for decimal handling)
 * @param v - Value to convert
 * @param scale - Scale factor (e.g., 1000n for thousandths)
 * @returns Scaled BigInt or null
 */
export function toScaledBigInt(v: unknown, scale: bigint): bigint | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return BigInt(Math.round(n * Number(scale)));
}

/**
 * Calculate percentage difference between actual and estimate
 * @param actual - Actual value
 * @param estimate - Estimated value
 * @returns Percentage difference or null
 */
export function pctDiff(actual: bigint | null, estimate: bigint | null): number | null {
  if (actual == null || estimate == null || estimate === 0n) return null;
  // Convert to Number for display purposes
  const a = Number(actual);
  const e = Number(estimate);
  if (!Number.isFinite(a) || !Number.isFinite(e) || e === 0) return null;
  return ((a - e) / e) * 100;
}

/**
 * Safely convert number to string with precision
 * @param value - Number to convert
 * @param precision - Decimal places
 * @returns Formatted string
 */
export function formatNumber(value: number | null | undefined, precision = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  return value.toFixed(precision);
}

/**
 * Format number percentage with sign
 * @param value - Percentage value
 * @param precision - Decimal places
 * @returns Formatted percentage string
 */
export function formatNumberPercentage(value: number | null | undefined, precision = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(precision)}%`;
}

/**
 * Clamp number between min and max values
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Check if number is within range
 * @param value - Value to check
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns True if within range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Round number to specified decimal places
 * @param value - Value to round
 * @param decimals - Number of decimal places
 * @returns Rounded number
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Calculate percentage of total
 * @param part - Part value
 * @param total - Total value
 * @returns Percentage or null
 */
export function calculatePercentage(part: number, total: number): number | null {
  if (total === 0 || !Number.isFinite(part) || !Number.isFinite(total)) return null;
  return (part / total) * 100;
}

/**
 * Parse number safely from string
 * @param str - String to parse
 * @returns Number or null if invalid
 */
export function parseNumber(str: string | null | undefined): number | null {
  if (!str) return null;
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

/**
 * Check if value is a valid number
 * @param value - Value to check
 * @returns True if valid number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
