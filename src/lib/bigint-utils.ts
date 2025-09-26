/**
 * Utility functions for handling BigInt serialization
 */

export function bigIntToNumber(value: bigint | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

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

export function formatCurrency(value: bigint | number | null): string {
  if (!value) return '-';
  const num = typeof value === 'bigint' ? Number(value) : value;
  
  if (num >= 1e12) {
    return `${(num / 1e12).toFixed(1)}T`;
  } else if (num >= 1e9) {
    return `${(num / 1e9).toFixed(1)}B`;
  } else if (num >= 1e6) {
    return `${(num / 1e6).toFixed(1)}M`;
  } else if (num >= 1e3) {
    return `${(num / 1e3).toFixed(1)}K`;
  } else {
    return `${num.toFixed(0)}`;
  }
}

export function formatMarketCapDiff(value: bigint | number | null): string {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'bigint' ? Number(value) : value;
  
  // Handle zero case
  if (num === 0) return '0B';
  
  const absNum = Math.abs(num);
  const sign = num >= 0 ? '+' : '-';
  
  if (absNum >= 1e12) {
    return `${sign}${(absNum / 1e12).toFixed(1)}T`;
  } else if (absNum >= 1e9) {
    return `${sign}${(absNum / 1e9).toFixed(1)}B`;
  } else if (absNum >= 1e6) {
    return `${sign}${(absNum / 1e6).toFixed(1)}M`;
  } else if (absNum >= 1e3) {
    return `${sign}${(absNum / 1e3).toFixed(1)}K`;
  } else {
    return `${sign}${absNum.toFixed(0)}`;
  }
}
