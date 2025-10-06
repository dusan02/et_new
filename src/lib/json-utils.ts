/**
 * Safe JSON serialization utilities for BigInt and other edge cases
 */

/**
 * Safely serialize objects containing BigInt values
 * Converts BigInt to string if it's not a safe integer, otherwise to number
 */
export function safeJsonStringify(obj: any): string {
  return JSON.stringify(obj, (_, value) => {
    if (typeof value === 'bigint') {
      return Number.isSafeInteger(Number(value)) ? Number(value) : value.toString()
    }
    return value
  })
}

/**
 * Create a Response with safe JSON serialization
 */
export function createJsonResponse(payload: any, headers: Record<string, string> = {}): Response {
  return new Response(safeJsonStringify(payload), {
    headers: {
      'content-type': 'application/json',
      ...headers
    }
  })
}

/**
 * Ensure all header values are strings
 */
export function stringifyHeaders(headers: Record<string, any>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    result[key] = String(value)
  }
  return result
}
