/**
 * 📊 Monitoring & Analytics Infrastructure
 * Comprehensive monitoring solution with multiple providers support
 */

interface MonitoringConfig {
  datadogApiKey?: string
  newRelicLicenseKey?: string
  environment: 'development' | 'production' | 'test'
  serviceName: string
  version: string
}

interface Metric {
  name: string
  value: number
  tags?: Record<string, string>
  timestamp?: number
}

interface LogEvent {
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  context?: Record<string, any>
  timestamp?: number
}

interface ErrorEvent {
  error: Error
  context?: Record<string, any>
  user?: string
  timestamp?: number
}

class MonitoringService {
  private config: MonitoringConfig
  private metrics: Metric[] = []
  private logs: LogEvent[] = []
  private errors: ErrorEvent[] = []

  constructor(config: MonitoringConfig) {
    this.config = config
    this.initializeProviders()
  }

  private initializeProviders() {
    // Only initialize browser-specific monitoring on client side
    if (typeof window === 'undefined') {
      console.log('[MONITORING] Server-side monitoring initialized')
      return
    }

    // Initialize DataDog
    if (this.config.datadogApiKey) {
      this.initializeDataDog()
    }

    // Initialize New Relic
    if (this.config.newRelicLicenseKey) {
      this.initializeNewRelic()
    }

    // Setup browser monitoring
    this.initializeBrowserMonitoring()
  }

  private initializeDataDog() {
    if (typeof window !== 'undefined') {
      // Browser DataDog RUM setup
      (window as any).DD_RUM = {
        applicationId: 'earnings-table-app',
        clientToken: this.config.datadogApiKey,
        env: this.config.environment,
        service: this.config.serviceName,
        version: this.config.version,
        sampleRate: 100,
        trackInteractions: true,
        defaultPrivacyLevel: 'mask-user-input'
      }
    }
  }

  private initializeNewRelic() {
    if (typeof window !== 'undefined') {
      // Browser New Relic setup
      (window as any).NREUM = {
        licenseKey: this.config.newRelicLicenseKey,
        applicationID: 'earnings-table-app'
      }
    }
  }

  private initializeBrowserMonitoring() {
    // Only run browser-specific code on client side
    if (typeof window === 'undefined') return

    // Performance observer for monitoring
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.trackMetric({
            name: `performance.${entry.entryType}`,
            value: entry.duration || (entry as any).loadEventEnd || 0,
            tags: {
              name: entry.name,
              type: entry.entryType
            }
          })
        }
      })

      observer.observe({ entryTypes: ['navigation', 'resource', 'paint'] })
    }

    // Error tracking
    window.addEventListener('error', (event) => {
      this.trackError({
        error: event.error || new Error(event.message),
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      })
    })

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        error: new Error(`Unhandled Promise Rejection: ${event.reason}`),
        context: { reason: event.reason }
      })
    })
  }

  // Metric tracking
  trackMetric(metric: Metric) {
    const enhancedMetric: Metric = {
      ...metric,
      timestamp: metric.timestamp || Date.now(),
      tags: {
        ...metric.tags,
        environment: this.config.environment,
        service: this.config.serviceName
      }
    }

    this.metrics.push(enhancedMetric)

    // Send to DataDog
    this.sendMetricToDataDog(enhancedMetric)

    // Send to New Relic
    this.sendMetricToNewRelic(enhancedMetric)

    // Local logging in development
    if (this.config.environment === 'development') {
      console.log('📊 [METRIC]', enhancedMetric)
    }
  }

  // Error tracking
  trackError(errorEvent: ErrorEvent) {
    const enhancedError: ErrorEvent = {
      ...errorEvent,
      timestamp: errorEvent.timestamp || Date.now(),
      context: {
        ...errorEvent.context,
        environment: this.config.environment,
        service: this.config.serviceName,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
        url: typeof window !== 'undefined' ? window.location.href : 'server'
      }
    }

    this.errors.push(enhancedError)

    // Send to error tracking services
    this.sendErrorToDataDog(enhancedError)
    this.sendErrorToNewRelic(enhancedError)

    // Log error in development
    if (this.config.environment === 'development') {
      console.error('🚨 [ERROR]', enhancedError)
    }
  }

  // Structured logging
  log(logEvent: LogEvent) {
    const enhancedLog: LogEvent = {
      ...logEvent,
      timestamp: logEvent.timestamp || Date.now(),
      context: {
        ...logEvent.context,
        environment: this.config.environment,
        service: this.config.serviceName
      }
    }

    this.logs.push(enhancedLog)

    // Send to logging services
    this.sendLogToDataDog(enhancedLog)
    this.sendLogToNewRelic(enhancedLog)

    // Console logging
    const logMethod = logEvent.level === 'error' ? console.error :
                     logEvent.level === 'warn' ? console.warn :
                     logEvent.level === 'debug' ? console.debug : console.log

    logMethod(`📝 [${logEvent.level.toUpperCase()}]`, logEvent.message, logEvent.context)
  }

  // Custom metric methods for common use cases
  trackAPICall(endpoint: string, method: string, duration: number, statusCode: number) {
    this.trackMetric({
      name: 'api.request',
      value: duration,
      tags: {
        endpoint,
        method,
        status_code: statusCode.toString(),
        status_class: Math.floor(statusCode / 100) + 'xx'
      }
    })
  }

  trackDatabaseQuery(query: string, duration: number, success: boolean) {
    this.trackMetric({
      name: 'database.query',
      value: duration,
      tags: {
        query_type: query.split(' ')[0].toLowerCase(),
        success: success.toString()
      }
    })
  }

  trackCacheOperation(operation: 'hit' | 'miss' | 'set' | 'delete', key: string) {
    this.trackMetric({
      name: 'cache.operation',
      value: 1,
      tags: {
        operation,
        cache_key: key
      }
    })
  }

  trackUserAction(action: string, context?: Record<string, any>) {
    this.trackMetric({
      name: 'user.action',
      value: 1,
      tags: {
        action,
        ...context
      }
    })
  }

  // Provider-specific methods
  private sendMetricToDataDog(metric: Metric) {
    if (!this.config.datadogApiKey) return

    // In browser - use RUM API
    if (typeof window !== 'undefined' && (window as any).DD_RUM) {
      (window as any).DD_RUM.addAction(metric.name, {
        value: metric.value,
        ...metric.tags
      })
    }

    // Server-side - HTTP API call would go here
    // fetch('https://api.datadoghq.com/api/v1/series', { ... })
  }

  private sendErrorToDataDog(errorEvent: ErrorEvent) {
    if (!this.config.datadogApiKey) return

    if (typeof window !== 'undefined' && (window as any).DD_RUM) {
      (window as any).DD_RUM.addError(errorEvent.error, errorEvent.context)
    }
  }

  private sendLogToDataDog(logEvent: LogEvent) {
    if (!this.config.datadogApiKey) return

    if (typeof window !== 'undefined' && (window as any).DD_RUM) {
      (window as any).DD_RUM.addLog(logEvent.message, logEvent.context, logEvent.level)
    }
  }

  private sendMetricToNewRelic(metric: Metric) {
    if (!this.config.newRelicLicenseKey) return

    if (typeof window !== 'undefined' && (window as any).newrelic) {
      (window as any).newrelic.addPageAction(metric.name, {
        value: metric.value,
        ...metric.tags
      })
    }
  }

  private sendErrorToNewRelic(errorEvent: ErrorEvent) {
    if (!this.config.newRelicLicenseKey) return

    if (typeof window !== 'undefined' && (window as any).newrelic) {
      (window as any).newrelic.noticeError(errorEvent.error, errorEvent.context)
    }
  }

  private sendLogToNewRelic(logEvent: LogEvent) {
    if (!this.config.newRelicLicenseKey) return

    if (typeof window !== 'undefined' && (window as any).newrelic) {
      (window as any).newrelic.addPageAction('log', {
        level: logEvent.level,
        message: logEvent.message,
        ...logEvent.context
      })
    }
  }

  // Health check and diagnostics
  getHealthStatus() {
    const now = Date.now()
    const last5Min = now - 5 * 60 * 1000

    const recentErrors = this.errors.filter(e => (e.timestamp || 0) > last5Min)
    const recentMetrics = this.metrics.filter(m => (m.timestamp || 0) > last5Min)

    return {
      status: recentErrors.length > 10 ? 'unhealthy' : 'healthy',
      errors: {
        total: this.errors.length,
        recent: recentErrors.length
      },
      metrics: {
        total: this.metrics.length,
        recent: recentMetrics.length
      },
      uptime: typeof process !== 'undefined' && process.uptime ? process.uptime() : 0,
      timestamp: now
    }
  }

  // Export data for debugging
  exportData() {
    return {
      config: this.config,
      metrics: this.metrics.slice(-100), // Last 100 metrics
      logs: this.logs.slice(-100), // Last 100 logs
      errors: this.errors.slice(-50) // Last 50 errors
    }
  }
}

// Global monitoring instance
let monitoring: MonitoringService | null = null

export function initializeMonitoring(config: MonitoringConfig) {
  monitoring = new MonitoringService(config)
  return monitoring
}

export function getMonitoring() {
  if (!monitoring) {
    // Return a mock monitoring service instead of throwing error
    return {
      trackMetric: () => {},
      trackError: () => {},
      trackAPICall: () => {},
      trackLog: () => {},
      trackUserAction: () => {},
      trackCacheOperation: () => {},
      isEnabled: () => false,
      getHealthStatus: () => ({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
        errors: { total: 0, recent: 0 },
        metrics: { total: 0, recent: 0 }
      }),
      exportData: () => ({
        metrics: [],
        errors: [],
        logs: [],
        summary: {
          totalRequests: 0,
          errorRate: 0,
          averageResponseTime: 0
        }
      })
    }
  }
  return monitoring
}

// Convenience exports
export type { MonitoringConfig, Metric, LogEvent, ErrorEvent }
export { MonitoringService }
