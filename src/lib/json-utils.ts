// JSON utilities for safe serialization
export function toJSONSafe(obj: any): any {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    console.error('JSON serialization error:', error);
    return null;
  }
}

export function createJsonResponse(data: any, status: number = 200) {
  return {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  };
}

export function stringifyHeaders(headers: Record<string, string>): string {
  return Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}