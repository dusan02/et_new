/**
 * 🔧 SHARED MODULE - Environment Configuration
 * Centralized environment variable management
 */

import { parseEnvSoft, parseEnvStrict, type Env } from '../../../lib/env-validation'

export interface EnvironmentConfig extends Env {
  // Additional fields
  PORT: number
  BASE_URL?: string
  ENABLE_CACHING: boolean
  ENABLE_MONITORING: boolean
  ENABLE_GUIDANCE: boolean
  API_TIMEOUT: number
  BATCH_SIZE: number
  MAX_RETRIES: number
}

const isBuildPhase =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.NODE_ENV === 'test'

/**
 * Load and validate environment configuration
 * @returns Validated environment config
 */
export function loadEnvironmentConfig(): EnvironmentConfig | Partial<EnvironmentConfig> {
  // ✅ volaj len v RUNTIME (v handleroch / serverových funkciách)
  // Skip validation in browser environment
  if (typeof window !== 'undefined') {
    return {} as EnvironmentConfig
  }
  
  const baseEnv = isBuildPhase ? parseEnvSoft(process.env) : parseEnvStrict(process.env)
  
  const config: EnvironmentConfig = {
    ...baseEnv,
    // Additional fields
    PORT: parseInt(process.env.PORT || '3000', 10),
    BASE_URL: process.env.BASE_URL,
    ENABLE_CACHING: process.env.ENABLE_CACHING === 'true',
    ENABLE_MONITORING: process.env.ENABLE_MONITORING === 'true',
    ENABLE_GUIDANCE: process.env.ENABLE_GUIDANCE === 'true',
    API_TIMEOUT: parseInt(process.env.API_TIMEOUT || '10000', 10),
    BATCH_SIZE: parseInt(process.env.BATCH_SIZE || '50', 10),
    MAX_RETRIES: parseInt(process.env.MAX_RETRIES || '3', 10)
  } as EnvironmentConfig
  
  return config
}

/**
 * Validate environment configuration
 * @param config - Environment config to validate
 * @throws Error if validation fails
 */
function validateEnvironmentConfig(config: EnvironmentConfig): void {
  const errors: string[] = []
  
  // Required in production (skip during build process)
  if (config.NODE_ENV === 'production' && !process.env.NEXT_PHASE) {
    if (!config.POLYGON_API_KEY) {
      errors.push('POLYGON_API_KEY is required in production')
    }
    
    if (!config.FINNHUB_API_KEY) {
      errors.push('FINNHUB_API_KEY is required in production')
    }
    
    if (!config.DATABASE_URL || config.DATABASE_URL === 'file:./dev.db') {
      errors.push('Valid DATABASE_URL is required in production')
    }
  }
  
  // Port validation
  if (config.PORT < 1 || config.PORT > 65535) {
    errors.push('PORT must be a valid port number (1-65535)')
  }
  
  // Timeout validation
  if (config.API_TIMEOUT < 1000 || config.API_TIMEOUT > 60000) {
    errors.push('API_TIMEOUT must be between 1000 and 60000 milliseconds')
  }
  
  // Batch size validation
  if (config.BATCH_SIZE < 1 || config.BATCH_SIZE > 1000) {
    errors.push('BATCH_SIZE must be between 1 and 1000')
  }
  
  // Retry validation
  if (config.MAX_RETRIES < 0 || config.MAX_RETRIES > 10) {
    errors.push('MAX_RETRIES must be between 0 and 10')
  }
  
  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`)
  }
}

/**
 * Check if running in development mode
 * @returns True if development environment
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * Check if running in production mode
 * @returns True if production environment
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * Check if running in test mode
 * @returns True if test environment
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test'
}

/**
 * Get environment-specific database URL
 * @returns Appropriate database URL for current environment
 */
export function getDatabaseUrl(): string {
  if (isTest()) {
    return process.env.TEST_DATABASE_URL || 'file:./test.db'
  }
  
  return process.env.DATABASE_URL || 'file:./dev.db'
}

/**
 * Get API configuration for external services
 * @returns API configuration object
 */
export function getApiConfig() {
  // Skip validation during build process
  const config = {
    POLYGON_API_KEY: process.env.POLYGON_API_KEY || '',
    FINNHUB_API_KEY: process.env.FINNHUB_API_KEY || '',
    API_TIMEOUT: parseInt(process.env.API_TIMEOUT || '10000', 10),
    MAX_RETRIES: parseInt(process.env.MAX_RETRIES || '3', 10)
  }
  
  return {
    polygon: {
      apiKey: config.POLYGON_API_KEY,
      baseUrl: 'https://api.polygon.io',
      timeout: config.API_TIMEOUT,
      retries: config.MAX_RETRIES
    },
    finnhub: {
      apiKey: config.FINNHUB_API_KEY,
      baseUrl: 'https://finnhub.io/api/v1',
      timeout: config.API_TIMEOUT,
      retries: config.MAX_RETRIES
    }
  }
}

/**
 * Get caching configuration
 * @returns Cache configuration object
 */
export function getCacheConfig() {
  return {
    enabled: process.env.ENABLE_CACHING === 'true',
    redisUrl: process.env.REDIS_URL,
    defaultTtl: parseInt(process.env.CACHE_TTL || '300', 10), // 5 minutes
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10)
  }
}

/**
 * Get feature flags
 * @returns Feature flags object
 */
export function getFeatureFlags() {
  return {
    enableCaching: process.env.ENABLE_CACHING === 'true',
    enableMonitoring: process.env.ENABLE_MONITORING === 'true',
    enableGuidance: process.env.ENABLE_GUIDANCE === 'true',
    enableWebsockets: process.env.ENABLE_WEBSOCKETS === 'true',
    enableRateLimit: process.env.ENABLE_RATE_LIMIT === 'true'
  }
}

// ⚠️ NEexportuj žiadnu top-level konštantu, ktorá by validovala už pri importe!
// Používaj loadEnvironmentConfig() vo vnútri funkcií
