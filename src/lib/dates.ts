/**
 * Date utility functions with New York timezone support
 */

const NY_TIMEZONE = 'America/New_York'

export function getNYDate(): Date {
  return new Date(new Date().toLocaleString("en-US", {timeZone: NY_TIMEZONE}))
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
