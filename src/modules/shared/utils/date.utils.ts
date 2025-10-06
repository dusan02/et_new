/**
 * 🔧 SHARED MODULE - Date Utilities
 * Centralized date/time helper functions
 */

/**
 * Get NY timezone date
 * @returns Date object in NY timezone
 */
export function getNYDate(): Date {
  const now = new Date()
  // Use Intl.DateTimeFormat to get NY timezone date components
  const nyFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  const parts = nyFormatter.formatToParts(now)
  const year = parseInt(parts.find(p => p.type === 'year')!.value)
  const month = parseInt(parts.find(p => p.type === 'month')!.value) - 1 // JS months are 0-based
  const day = parseInt(parts.find(p => p.type === 'day')!.value)
  const hour = parseInt(parts.find(p => p.type === 'hour')!.value)
  const minute = parseInt(parts.find(p => p.type === 'minute')!.value)
  const second = parseInt(parts.find(p => p.type === 'second')!.value)
  
  return new Date(year, month, day, hour, minute, second)
}

/**
 * Get today's date at start of day in NY timezone
 * @returns Date object for start of today in NY time
 */
export function getTodayStart(): Date {
  const today = getNYDate()
  // Create date string in YYYY-MM-DD format for NY timezone
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const dateString = `${year}-${month}-${day}`
  // Return date in UTC format to match database storage
  return new Date(dateString + 'T00:00:00.000Z')
}

/**
 * Get today's end date in NY timezone
 * @returns Date object for end of today in NY time
 */
export function getTodayEnd(): Date {
  const today = getNYDate()
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
}

/**
 * Get current NY time as string
 * @returns Formatted NY time string
 */
export function getNYTimeString(): string {
  return new Date().toLocaleString("en-US", { 
    timeZone: "America/New_York",
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * Get ISO date string for NY timezone
 * @param date - Date object (defaults to today)
 * @returns ISO date string (YYYY-MM-DD)
 */
export function isoDate(date?: Date): string {
  if (date) {
    return date.toISOString().split('T')[0]
  }
  
  // Get current date in NY timezone
  const nyNow = new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  const nyDate = new Date(nyNow)
  
  // Format as YYYY-MM-DD
  const year = nyDate.getFullYear()
  const month = String(nyDate.getMonth() + 1).padStart(2, '0')
  const day = String(nyDate.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * Convert date to NY timezone
 * @param date - Date to convert
 * @returns Date in NY timezone
 */
export function toNYTimezone(date: Date): Date {
  return new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }))
}

/**
 * Format date for display
 * @param date - Date to format
 * @param format - Format type
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | null,
  format: 'short' | 'medium' | 'long' | 'iso' = 'medium'
): string {
  if (!date) return '-'
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) return 'Invalid Date'
  
  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    case 'medium':
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    case 'long':
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      })
    case 'iso':
      return dateObj.toISOString().split('T')[0]
    default:
      return dateObj.toLocaleDateString()
  }
}

/**
 * Format time for display
 * @param date - Date to format
 * @param includeSeconds - Include seconds in output
 * @returns Formatted time string
 */
export function formatTime(date: Date | string | null, includeSeconds = false): string {
  if (!date) return '-'
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) return 'Invalid Time'
  
  return dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined
  })
}

/**
 * Format datetime for display
 * @param date - Date to format
 * @returns Formatted datetime string
 */
export function formatDateTime(date: Date | string | null): string {
  if (!date) return '-'
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) return 'Invalid DateTime'
  
  return `${formatDate(dateObj, 'medium')} ${formatTime(dateObj)}`
}

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param date - Date to compare
 * @param baseDate - Base date to compare against (defaults to now)
 * @returns Relative time string
 */
export function getRelativeTime(date: Date | string, baseDate?: Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const base = baseDate || new Date()
  
  if (isNaN(dateObj.getTime())) return 'Invalid Date'
  
  const diffMs = base.getTime() - dateObj.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  
  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`
  
  return formatDate(dateObj, 'medium')
}

/**
 * Check if date is today
 * @param date - Date to check
 * @returns True if date is today
 */
export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  
  return dateObj.toDateString() === today.toDateString()
}

/**
 * Check if date is within last N days
 * @param date - Date to check
 * @param days - Number of days
 * @returns True if within range
 */
export function isWithinLastDays(date: Date | string, days: number): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  
  return dateObj >= cutoff
}

/**
 * Add business days to date (skipping weekends)
 * @param date - Starting date
 * @param businessDays - Number of business days to add
 * @returns New date with business days added
 */
export function addBusinessDays(date: Date, businessDays: number): Date {
  const result = new Date(date)
  let daysAdded = 0
  
  while (daysAdded < businessDays) {
    result.setDate(result.getDate() + 1)
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      daysAdded++
    }
  }
  
  return result
}

/**
 * Check if date is a business day (Monday-Friday)
 * @param date - Date to check
 * @returns True if business day
 */
export function isBusinessDay(date: Date): boolean {
  const day = date.getDay()
  return day > 0 && day < 6 // Monday = 1, Friday = 5
}

/**
 * Get start and end of day for a date
 * @param date - Date to get bounds for
 * @returns Object with start and end times
 */
export function getDayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  
  return { start, end }
}

/**
 * Parse date string safely
 * @param dateString - Date string to parse
 * @returns Date object or null if invalid
 */
export function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null
  
  const date = new Date(dateString)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Get fiscal quarter from date
 * @param date - Date to get quarter for
 * @returns Quarter string (Q1, Q2, Q3, Q4)
 */
export function getFiscalQuarter(date: Date): string {
  const month = date.getMonth() + 1 // 1-based month
  
  if (month <= 3) return 'Q1'
  if (month <= 6) return 'Q2'  
  if (month <= 9) return 'Q3'
  return 'Q4'
}

/**
 * Check if two dates are the same day
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.toDateString() === date2.toDateString()
}

/**
 * Check if current time is during market hours (9:30 AM - 4:00 PM ET)
 * @returns True if market is open
 */
export function isMarketHours(): boolean {
  const nyTime = getNYDate()
  const hour = nyTime.getHours()
  const day = nyTime.getDay() // 0 = Sunday, 6 = Saturday
  
  // Market is closed on weekends
  if (day === 0 || day === 6) return false
  
  // Market hours: 9:30 AM - 4:00 PM ET
  return hour >= 9 && hour < 16
}

/**
 * Get next market open date
 * @returns Date of next market open
 */
export function getNextMarketOpen(): Date {
  const nyTime = getNYDate()
  const nextOpen = new Date(nyTime)
  
  // If it's weekend, set to next Monday
  if (nyTime.getDay() === 0) { // Sunday
    nextOpen.setDate(nyTime.getDate() + 1)
  } else if (nyTime.getDay() === 6) { // Saturday
    nextOpen.setDate(nyTime.getDate() + 2)
  } else if (nyTime.getHours() >= 16) { // After market close
    nextOpen.setDate(nyTime.getDate() + 1)
  }
  
  // Set to 9:30 AM ET
  nextOpen.setHours(9, 30, 0, 0)
  return nextOpen
}

/**
 * Normalize date to UTC midnight for consistent database storage
 * This prevents timezone issues when comparing dates in database queries
 * @param date - Date to normalize
 * @returns Date normalized to UTC midnight (00:00:00.000Z)
 */
export function toReportDateUTC(date: Date): Date {
  // Get the date components in UTC
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  
  // Create new date at UTC midnight
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0))
}

/**
 * Get today's date normalized to UTC midnight
 * @returns Date object for today at UTC midnight
 */
export function getTodayUTC(): Date {
  return toReportDateUTC(new Date())
}