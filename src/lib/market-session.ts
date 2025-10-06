/**
 * Market session detection utilities
 */

export type MarketSession = 'pre' | 'rth' | 'post' | 'closed'

/**
 * Detect current market session based on NY time
 */
export function detectMarketSession(nowUTC: Date = new Date(), tzIana: string = 'America/New_York'): MarketSession {
  const nyTime = new Date(nowUTC.toLocaleString("en-US", { timeZone: tzIana }))
  const hour = nyTime.getHours()
  const minute = nyTime.getMinutes()
  const dayOfWeek = nyTime.getDay() // 0 = Sunday, 6 = Saturday
  
  // Weekend - market closed
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 'closed'
  }
  
  // Pre-market: 4:00 AM - 9:30 AM ET
  if (hour >= 4 && (hour < 9 || (hour === 9 && minute < 30))) {
    return 'pre'
  }
  
  // Regular Trading Hours: 9:30 AM - 4:00 PM ET
  if ((hour === 9 && minute >= 30) || (hour >= 10 && hour < 16)) {
    return 'rth'
  }
  
  // After-hours: 4:00 PM - 8:00 PM ET
  if (hour >= 16 && hour < 20) {
    return 'post'
  }
  
  // Outside trading hours
  return 'closed'
}

/**
 * Get TTL based on market session
 */
export function getTTLForSession(session: MarketSession, noCache: boolean = false): number {
  if (noCache) return 0
  
  switch (session) {
    case 'rth':
      return 60 // 1 minute during RTH
    case 'pre':
    case 'post':
      return 300 // 5 minutes during extended hours
    case 'closed':
    default:
      return 600 // 10 minutes when market is closed
  }
}

/**
 * Check if market is currently open (RTH)
 */
export function isMarketOpen(nowUTC: Date = new Date()): boolean {
  return detectMarketSession(nowUTC) === 'rth'
}

/**
 * Check if market is in extended hours (pre/post)
 */
export function isExtendedHours(nowUTC: Date = new Date()): boolean {
  const session = detectMarketSession(nowUTC)
  return session === 'pre' || session === 'post'
}
