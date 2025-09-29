/**
 * 🔧 SHARED MODULE - Application Constants
 * Global constants used across the application
 */

// API Constants
export const API_ENDPOINTS = {
  EARNINGS: '/api/earnings',
  EARNINGS_STATS: '/api/earnings/stats',
  MARKET_DATA: '/api/market-data',
  HEALTH: '/api/monitoring/health',
  METRICS: '/api/monitoring/metrics'
} as const

export const EXTERNAL_APIS = {
  POLYGON: {
    BASE_URL: 'https://api.polygon.io',
    PREV_CLOSE: '/v2/aggs/ticker/{ticker}/prev',
    SNAPSHOT: '/v2/snapshot/locale/us/markets/stocks/tickers/{ticker}',
    TICKER_DETAILS: '/v3/reference/tickers/{ticker}'
  },
  FINNHUB: {
    BASE_URL: 'https://finnhub.io/api/v1',
    EARNINGS_CALENDAR: '/calendar/earnings'
  }
} as const

// Time Constants
export const TIME_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000
} as const

// Cache TTL (Time To Live) Constants
export const CACHE_TTL = {
  SHORT: 5 * TIME_CONSTANTS.MINUTE,      // 5 minutes
  MEDIUM: 30 * TIME_CONSTANTS.MINUTE,    // 30 minutes
  LONG: 2 * TIME_CONSTANTS.HOUR,         // 2 hours
  DAILY: TIME_CONSTANTS.DAY              // 24 hours
} as const

// Market Constants
export const MARKET_HOURS = {
  PREMARKET_START: '04:00',
  MARKET_OPEN: '09:30',
  MARKET_CLOSE: '16:00',
  AFTERHOURS_END: '20:00',
  TIMEZONE: 'America/New_York'
} as const

export const REPORT_TIMES = {
  BMO: 'Before Market Open',
  AMC: 'After Market Close',
  TNS: 'Time Not Specified'
} as const

// Company Size Thresholds (in USD)
export const SHARED_MARKET_CAP_THRESHOLDS = {
  MEGA: 200_000_000_000,    // $200B+
  LARGE: 10_000_000_000,    // $10B - $200B
  MID: 2_000_000_000,       // $2B - $10B
  SMALL: 0                  // < $2B
} as const

export const COMPANY_SIZES = ['Mega', 'Large', 'Mid', 'Small'] as const

// Data Source Priority
export const DATA_SOURCE_PRIORITY = {
  finnhub: 1,
  polygon: 2,
  benzinga: 3,
  manual: 4
} as const

// Pagination Constants
export const PAGINATION = {
  DEFAULT_LIMIT: 25,
  MAX_LIMIT: 1000,
  DEFAULT_OFFSET: 0
} as const

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
} as const

// Error Codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  RATE_LIMITED: 'RATE_LIMITED',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const

// Queue Job Types
export const JOB_TYPES = {
  FETCH_EARNINGS: 'fetch-earnings',
  FETCH_MARKET_DATA: 'fetch-market-data',
  CLEAR_OLD_DATA: 'clear-old-data',
  SEND_NOTIFICATION: 'send-notification',
  GENERATE_REPORT: 'generate-report'
} as const

// Retry Configuration
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY: 1000,      // 1 second
  MAX_DELAY: 30000,      // 30 seconds
  BACKOFF_FACTOR: 2,     // Exponential backoff
  RETRYABLE_ERRORS: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED'
  ]
} as const

// Validation Constants
export const VALIDATION = {
  TICKER_REGEX: /^[A-Z]{1,5}$/,
  PRICE_MIN: 0.01,
  PRICE_MAX: 100000,
  MARKET_CAP_MIN: 1000000,       // $1M
  MARKET_CAP_MAX: 10000000000000, // $10T
  FISCAL_YEAR_MIN: 2000,
  FISCAL_YEAR_MAX: 2030
} as const

// Feature Flags
export const FEATURES = {
  ENABLE_CACHING: 'ENABLE_CACHING',
  ENABLE_MONITORING: 'ENABLE_MONITORING',
  ENABLE_GUIDANCE: 'ENABLE_GUIDANCE',
  ENABLE_WEBSOCKETS: 'ENABLE_WEBSOCKETS',
  ENABLE_RATE_LIMITING: 'ENABLE_RATE_LIMITING'
} as const

// File Upload Constants
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,  // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
  MAX_FILES: 5
} as const

// Rate Limiting
export const RATE_LIMITS = {
  DEFAULT: {
    window: 15 * TIME_CONSTANTS.MINUTE,
    requests: 100
  },
  API: {
    window: TIME_CONSTANTS.MINUTE,
    requests: 60
  },
  AUTH: {
    window: 15 * TIME_CONSTANTS.MINUTE,
    requests: 5
  }
} as const

// Monitoring Thresholds
export const MONITORING_THRESHOLDS = {
  CPU_USAGE: 80,           // %
  MEMORY_USAGE: 85,        // %
  RESPONSE_TIME: 5000,     // ms
  ERROR_RATE: 5,           // %
  DISK_USAGE: 90           // %
} as const

// Database Constants
export const DATABASE = {
  CONNECTION_TIMEOUT: 10000,  // 10 seconds
  QUERY_TIMEOUT: 30000,       // 30 seconds
  POOL_SIZE: 10,
  IDLE_TIMEOUT: 300000        // 5 minutes
} as const

// Application Metadata
export const APP_METADATA = {
  NAME: 'Earnings Table',
  VERSION: '1.0.0',
  DESCRIPTION: 'Real-time earnings dashboard with market data',
  AUTHOR: 'Earnings Team',
  LICENSE: 'MIT'
} as const

// Default Values
export const DEFAULTS = {
  COMPANY_TYPE: 'Public',
  PRIMARY_EXCHANGE: 'NYSE',
  BATCH_SIZE: 50,
  API_TIMEOUT: 10000,
  CACHE_TTL: 300          // 5 minutes
} as const
