/**
 * Date utility functions with New York timezone support
 */

const NY_TIMEZONE = 'America/New_York'

export function getNYDate(): Date {
  const now = new Date()
  // Use Intl.DateTimeFormat to get NY timezone date components
  const nyFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: NY_TIMEZONE,
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

export function isoDate(d = getNYDate()) {
  // Create date string in YYYY-MM-DD format for NY timezone
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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

export function getTodayEnd(): Date {
  const today = getNYDate()
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function isToday(date: Date): boolean {
  const today = getNYDate()
  return date.toDateString() === today.toDateString()
}

export function getNYTimeString(): string {
  return getNYDate().toLocaleString("en-US", {timeZone: NY_TIMEZONE})
}

export function isMarketHours(): boolean {
  const nyTime = getNYDate()
  const hour = nyTime.getHours()
  const day = nyTime.getDay() // 0 = Sunday, 6 = Saturday
  
  // Market is closed on weekends
  if (day === 0 || day === 6) return false
  
  // Market hours: 9:30 AM - 4:00 PM ET
  return hour >= 9 && hour < 16
}

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
