/**
 * 🔧 SHARED MODULE - BigInt Utilities
 * Helper functions for BigInt handling and serialization
 */

/**
 * Convert BigInt to number safely
 * @param value - BigInt value to convert
 * @returns Number or null
 */
export function bigIntToNumber(value: bigint | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

/**
 * Serialize BigInt values in objects for JSON
 * @param obj - Object containing potential BigInt values
 * @returns Object with BigInts converted to numbers
 */
export function serializeBigInts(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInts);
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeBigInts(value);
    }
    return result;
  }
  
  return obj;
}

/**
 * Convert number to BigInt safely
 * @param value - Number to convert
 * @returns BigInt or null
 */
export function numberToBigInt(value: number | null | undefined): bigint | null {
  if (value === null || value === undefined || isNaN(value)) return null;
  return BigInt(Math.round(value));
}

/**
 * Format BigInt as readable string
 * @param value - BigInt value
 * @returns Formatted string
 */
export function formatBigInt(value: bigint | null | undefined): string {
  if (value === null || value === undefined) return '-';
  
  const num = Number(value);
  
  if (num >= 1e12) {
    return `${(num / 1e12).toFixed(1)}T`;
  } else if (num >= 1e9) {
    return `${(num / 1e9).toFixed(1)}B`;
  } else if (num >= 1e6) {
    return `${(num / 1e6).toFixed(1)}M`;
  } else if (num >= 1e3) {
    return `${(num / 1e3).toFixed(1)}K`;
  } else {
    return num.toString();
  }
}

/**
 * Compare BigInt values safely
 * @param a - First BigInt value
 * @param b - Second BigInt value
 * @returns Comparison result (-1, 0, 1)
 */
export function compareBigInt(
  a: bigint | null | undefined, 
  b: bigint | null | undefined
): number {
  if (a === null || a === undefined) return b === null || b === undefined ? 0 : -1;
  if (b === null || b === undefined) return 1;
  
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Add BigInt values safely
 * @param values - Array of BigInt values
 * @returns Sum or null if no valid values
 */
export function addBigInts(...values: (bigint | null | undefined)[]): bigint | null {
  const validValues = values.filter(v => v !== null && v !== undefined) as bigint[];
  
  if (validValues.length === 0) return null;
  
  return validValues.reduce((sum, value) => sum + value, BigInt(0));
}

/**
 * Validate BigInt value
 * @param value - Value to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Validation result
 */
export function validateBigInt(
  value: bigint | null | undefined,
  min?: bigint,
  max?: bigint
): { isValid: boolean; error?: string } {
  if (value === null || value === undefined) {
    return { isValid: false, error: 'Value is null or undefined' };
  }
  
  if (min !== undefined && value < min) {
    return { isValid: false, error: `Value ${value} is less than minimum ${min}` };
  }
  
  if (max !== undefined && value > max) {
    return { isValid: false, error: `Value ${value} is greater than maximum ${max}` };
  }
  
  return { isValid: true };
}
