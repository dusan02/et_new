/**
 * 🔧 SHARED MODULE - JSON Utilities
 * Helper functions for JSON serialization and BigInt handling
 */

/**
 * Safely serialize BigInt values to JSON
 * @param input - Input object to serialize
 * @returns JSON-safe object with BigInts converted to numbers/strings
 */
export function toJSONSafe<T>(input: T): any {
  const seen = new WeakSet<object>();

  const walk = (val: any): any => {
    if (typeof val === 'bigint') {
      // If overflow risk, use String(val) instead of Number(val)
      const n = Number(val);
      return Number.isFinite(n) ? n : String(val);
    }
    if (Array.isArray(val)) return val.map(walk);
    if (val && typeof val === 'object') {
      if (seen.has(val)) return null;
      seen.add(val);
      return Object.fromEntries(Object.entries(val).map(([k, v]) => [k, walk(v)]));
    }
    return val;
  };

  return walk(input);
}

/**
 * Parse JSON string safely
 * @param jsonString - JSON string to parse
 * @returns Parsed object or null if invalid
 */
export function parseJSON<T = any>(jsonString: string | null | undefined): T | null {
  if (!jsonString) return null;
  
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return null;
  }
}

/**
 * Stringify object safely with BigInt handling
 * @param obj - Object to stringify
 * @param space - Indentation space (default: 2)
 * @returns JSON string or null if error
 */
export function stringifyJSON(obj: any, space = 2): string | null {
  try {
    return JSON.stringify(toJSONSafe(obj), null, space);
  } catch (error) {
    console.warn('Failed to stringify JSON:', error);
    return null;
  }
}

/**
 * Deep clone object with BigInt handling
 * @param obj - Object to clone
 * @returns Cloned object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(toJSONSafe(obj))) as T;
}

/**
 * Check if value is serializable to JSON
 * @param value - Value to check
 * @returns True if serializable
 */
export function isJSONSerializable(value: any): boolean {
  try {
    JSON.stringify(toJSONSafe(value));
    return true;
  } catch (error) {
    return false;
  }
}
