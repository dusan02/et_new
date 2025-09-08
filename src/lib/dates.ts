/**
 * Date utility functions
 */

export function isoDate(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10)
}

export function getTodayStart(): Date {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth(), today.getDate())
}

export function getTodayEnd(): Date {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function isToday(date: Date): boolean {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}
