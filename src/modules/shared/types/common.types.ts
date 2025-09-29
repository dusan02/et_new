/**
 * 🔧 SHARED MODULE - Common Types
 * Zdieľané TypeScript typy pre celú aplikáciu
 */

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
  timestamp: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Date/Time Types
export interface DateRange {
  startDate: Date
  endDate: Date
}

export interface TimezonedDate {
  date: Date
  timezone: string
  formatted: string
}

// Validation Types
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

export interface ValidationRule<T> {
  field: keyof T
  validator: (value: any) => ValidationResult
  message: string
}

// Error Types
export interface AppError {
  code: string
  message: string
  details?: any
  timestamp: Date
  stackTrace?: string
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface LoggedError extends AppError {
  severity: ErrorSeverity
  userId?: string
  sessionId?: string
  userAgent?: string
}

// Configuration Types
export interface DatabaseConfig {
  url: string
  poolSize?: number
  timeout?: number
  retries?: number
}

export interface ApiConfig {
  baseUrl: string
  apiKey: string
  timeout?: number
  retries?: number
  rateLimit?: {
    requests: number
    window: number // in seconds
  }
}

export interface CacheConfig {
  ttl: number // Time to live in seconds
  maxSize?: number
  strategy: 'lru' | 'fifo' | 'lfu'
}

// Utility Types
export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// Generic Filter Types
export interface BaseFilters {
  limit?: number
  offset?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
}

export interface DateFilters {
  startDate?: Date
  endDate?: Date
  dateField?: string
}

// Event Types
export interface DomainEvent {
  id: string
  type: string
  data: any
  timestamp: Date
  source: string
}

export interface EventHandler<T> {
  handle(event: DomainEvent & { data: T }): Promise<void>
}

// Performance Types
export interface PerformanceMetrics {
  startTime: number
  endTime: number
  duration: number
  memoryUsage?: NodeJS.MemoryUsage
  cpuUsage?: NodeJS.CpuUsage
}

export interface Benchmark {
  name: string
  metrics: PerformanceMetrics
  iterations?: number
  notes?: string
}

// Health Check Types
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: Date
  uptime: number
  version: string
  dependencies: Record<string, DependencyHealth>
}

export interface DependencyHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime?: number
  lastCheck: Date
  error?: string
}

// Audit Types
export interface AuditLog {
  id: string
  action: string
  entity: string
  entityId: string
  userId?: string
  changes?: Record<string, { old: any; new: any }>
  timestamp: Date
  ip?: string
  userAgent?: string
}

// File/Upload Types
export interface FileInfo {
  filename: string
  originalName: string
  mimetype: string
  size: number
  path: string
  uploadedAt: Date
}

export interface UploadResult {
  success: boolean
  file?: FileInfo
  error?: string
}

// Queue/Job Types
export interface JobData {
  id: string
  type: string
  data: any
  priority?: number
  delay?: number
  attempts?: number
  backoff?: {
    type: 'fixed' | 'exponential'
    delay: number
  }
}

export interface JobResult {
  success: boolean
  data?: any
  error?: string
  duration: number
}

// Cache Types
export interface CacheItem<T> {
  key: string
  value: T
  expiresAt: Date
  createdAt: Date
  accessCount: number
  lastAccessed: Date
}

export interface CacheStats {
  hits: number
  misses: number
  size: number
  hitRate: number
  evictions: number
}
