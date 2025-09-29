/**
 * 🔧 SHARED MODULE - Format Utilities
 * Formatting helper functions for display
 */

/**
 * Format number as currency
 * @param value - Number to format
 * @param currency - Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number | bigint | null | undefined,
  currency = 'USD'
): string {
  if (value === null || value === undefined) return '-'
  
  const numValue = typeof value === 'bigint' ? Number(value) : value
  
  if (isNaN(numValue)) return 'Invalid'
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numValue)
}

/**
 * Format number with billions/millions suffix
 * @param value - Number to format
 * @returns Formatted string (e.g., "15.5B", "2.3T")
 */
export function formatBillions(value: number | bigint | null | undefined): string {
  if (value === null || value === undefined) return '-'
  
  const numValue = typeof value === 'bigint' ? Number(value) : value
  
  if (isNaN(numValue)) return 'Invalid'
  if (numValue === 0) return '0.0B'
  
  const abs = Math.abs(numValue)
  const sign = numValue < 0 ? '-' : ''
  
  if (abs >= 1000) {
    return `${sign}${(abs / 1000).toFixed(1)}T`
  } else if (abs >= 1) {
    return `${sign}${abs.toFixed(1)}B`
  } else if (abs >= 0.001) {
    return `${sign}${(abs * 1000).toFixed(0)}M`
  } else {
    return `${sign}${(abs * 1000000).toFixed(0)}K`
  }
}

/**
 * Format percentage with sign
 * @param value - Percentage value
 * @param precision - Decimal places (default: 2)
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number | null | undefined,
  precision = 2
): string {
  if (value === null || value === undefined) return '-'
  if (isNaN(value)) return 'Invalid'
  
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(precision)}%`
}

/**
 * Format large numbers with K/M/B suffixes
 * @param value - Number to format
 * @param precision - Decimal places (default: 1)
 * @returns Formatted string
 */
export function formatLargeNumber(
  value: number | bigint | null | undefined,
  precision = 1
): string {
  if (value === null || value === undefined) return '-'
  
  const numValue = typeof value === 'bigint' ? Number(value) : value
  
  if (isNaN(numValue)) return 'Invalid'
  if (numValue === 0) return '0'
  
  const abs = Math.abs(numValue)
  const sign = numValue < 0 ? '-' : ''
  
  if (abs >= 1e12) {
    return `${sign}${(abs / 1e12).toFixed(precision)}T`
  } else if (abs >= 1e9) {
    return `${sign}${(abs / 1e9).toFixed(precision)}B`
  } else if (abs >= 1e6) {
    return `${sign}${(abs / 1e6).toFixed(precision)}M`
  } else if (abs >= 1e3) {
    return `${sign}${(abs / 1e3).toFixed(precision)}K`
  } else {
    return numValue.toString()
  }
}

/**
 * Format stock price
 * @param value - Price value
 * @returns Formatted price string
 */
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  if (isNaN(value)) return 'Invalid'
  
  return `$${value.toFixed(2)}`
}

/**
 * Format shares outstanding
 * @param value - Shares value
 * @returns Formatted shares string
 */
export function formatShares(value: bigint | number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  
  const numValue = typeof value === 'bigint' ? Number(value) : value
  
  if (isNaN(numValue)) return 'Invalid'
  
  return formatLargeNumber(numValue) + ' shares'
}

/**
 * Format ticker for display
 * @param ticker - Stock ticker
 * @returns Formatted ticker
 */
export function formatTicker(ticker: string | null | undefined): string {
  if (!ticker) return '-'
  return ticker.toUpperCase()
}

/**
 * Format company name with truncation
 * @param name - Company name
 * @param maxLength - Maximum length (default: 30)
 * @returns Formatted company name
 */
export function formatCompanyName(
  name: string | null | undefined,
  maxLength = 30
): string {
  if (!name) return '-'
  
  if (name.length <= maxLength) return name
  
  return name.substring(0, maxLength - 3) + '...'
}

/**
 * Format file size
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format duration in milliseconds
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`
  return `${(ms / 3600000).toFixed(1)}h`
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param length - Maximum length
 * @param suffix - Suffix to add (default: '...')
 * @returns Truncated text
 */
export function truncateText(
  text: string | null | undefined,
  length: number,
  suffix = '...'
): string {
  if (!text) return '-'
  if (text.length <= length) return text
  
  return text.substring(0, length - suffix.length) + suffix
}

/**
 * Format phone number
 * @param phone - Phone number string
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '-'
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')
  
  // Format as (XXX) XXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  
  return phone // Return original if not standard format
}

/**
 * Format JSON for display
 * @param obj - Object to format
 * @param indent - Indentation spaces (default: 2)
 * @returns Formatted JSON string
 */
export function formatJSON(obj: any, indent = 2): string {
  try {
    return JSON.stringify(obj, null, indent)
  } catch (error) {
    return 'Invalid JSON'
  }
}

/**
 * Format boolean for display
 * @param value - Boolean value
 * @param labels - Custom labels [true, false]
 * @returns Formatted boolean string
 */
export function formatBoolean(
  value: boolean | null | undefined,
  labels: [string, string] = ['Yes', 'No']
): string {
  if (value === null || value === undefined) return '-'
  return value ? labels[0] : labels[1]
}

/**
 * Format array for display
 * @param arr - Array to format
 * @param separator - Separator string (default: ', ')
 * @param maxItems - Maximum items to show (default: 5)
 * @returns Formatted array string
 */
export function formatArray(
  arr: any[] | null | undefined,
  separator = ', ',
  maxItems = 5
): string {
  if (!arr || arr.length === 0) return '-'
  
  const items = arr.slice(0, maxItems)
  let result = items.join(separator)
  
  if (arr.length > maxItems) {
    result += ` (+${arr.length - maxItems} more)`
  }
  
  return result
}
