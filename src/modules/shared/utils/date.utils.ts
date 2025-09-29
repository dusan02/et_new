/**
 * 🔧 SHARED MODULE - Date Utilities
 * Centralized date/time helper functions
 */

/**
 * Get today's date at start of day in NY timezone
 * @returns Date object for start of today in NY time
 */
export function getTodayStart(): Date {
  const today = new Date()
  const nyDate = new Date(today.toLocaleString("en-US", { timeZone: "America/New_York" }))
  nyDate.setHours(0, 0, 0, 0)
  return nyDate
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
