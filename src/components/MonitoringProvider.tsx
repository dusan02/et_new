/**
 * 📊 Monitoring Provider Component
 * Initializes monitoring and provides context throughout the app
 */

'use client'

import React, { createContext, useContext, useEffect, ReactNode } from 'react'
import { initializeMonitoring, MonitoringService, type MonitoringConfig } from '@/lib/monitoring'
import { useHealthMonitoring } from '@/hooks/useMonitoring'

interface MonitoringContextType {
  monitoring: MonitoringService | null
  isEnabled: boolean
}

const MonitoringContext = createContext<MonitoringContextType>({
  monitoring: null,
  isEnabled: false
})

interface MonitoringProviderProps {
  children: ReactNode
  config?: Partial<MonitoringConfig>
  enableHealthCheck?: boolean
  healthCheckInterval?: number
}

export function MonitoringProvider({ 
  children, 
  config = {},
  enableHealthCheck = true,
  healthCheckInterval = 60000
}: MonitoringProviderProps) {
  const [monitoring, setMonitoring] = React.useState<MonitoringService | null>(null)

  // Memoize config to prevent infinite loops
  const monitoringConfig = React.useMemo(() => ({
    environment: (process.env.NODE_ENV as any) || 'development',
    serviceName: 'earnings-table',
    version: '1.0.0',
    datadogApiKey: process.env.DATADOG_API_KEY,
    newRelicLicenseKey: process.env.NEW_RELIC_LICENSE_KEY,
    ...config
  }), [config])

  useEffect(() => {
    // Only initialize monitoring on client side
    if (typeof window === 'undefined') return

    try {
      const monitoringInstance = initializeMonitoring(monitoringConfig)
      setMonitoring(monitoringInstance)

      // Track app initialization
      monitoringInstance.log({
        level: 'info',
        message: 'Application monitoring initialized',
        context: {
          environment: monitoringConfig.environment,
          service: monitoringConfig.serviceName,
          version: monitoringConfig.version
        }
      })

      // Track initial page load
      monitoringInstance.trackUserAction('app.initialized', {
        environment: monitoringConfig.environment,
        timestamp: Date.now()
      })

    } catch (error) {
      console.error('Failed to initialize monitoring:', error)
    }
  }, [monitoringConfig]) // Use memoized config

  // Enable health monitoring if requested (only on client side)
  const shouldEnableHealthCheck = enableHealthCheck && monitoring && typeof window !== 'undefined'
  
  useEffect(() => {
    if (!shouldEnableHealthCheck) return
    
    const interval = setInterval(() => {
      try {
        const health = monitoring.getHealthStatus()
        
        monitoring.trackMetric({
          name: 'system.health',
          value: health.status === 'healthy' ? 1 : 0,
          tags: {
            status: health.status,
            error_count: health.errors.recent.toString(),
            metric_count: health.metrics.recent.toString()
          }
        })
      } catch (error) {
        console.warn('Health monitoring failed:', error)
      }
    }, healthCheckInterval)

    return () => clearInterval(interval)
  }, [shouldEnableHealthCheck, monitoring, healthCheckInterval])

  const contextValue: MonitoringContextType = {
    monitoring,
    isEnabled: !!monitoring
  }

  return (
    <MonitoringContext.Provider value={contextValue}>
      {children}
    </MonitoringContext.Provider>
  )
}

// Hook to use monitoring context
export function useMonitoringContext() {
  const context = useContext(MonitoringContext)
  if (!context) {
    throw new Error('useMonitoringContext must be used within MonitoringProvider')
  }
  return context
}

// Error Boundary with monitoring
interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: any) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class MonitoringErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Track error with monitoring
    try {
      const monitoring = require('@/lib/monitoring').getMonitoring()
      monitoring.trackError({
        error,
        context: {
          component_stack: errorInfo.componentStack,
          error_boundary: true,
          react_error: true
        }
      })
    } catch (monitoringError) {
      console.error('Failed to track error:', monitoringError)
    }

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    console.error('React Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Something went wrong
                </h3>
              </div>
            </div>
            <div className="text-sm text-gray-500 mb-4">
              An error occurred while loading this page. Our team has been notified and is working on a fix.
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Reload Page
              </button>
              <button
                onClick={() => window.history.back()}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Go Back
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4">
                <summary className="text-sm font-medium text-gray-600 cursor-pointer">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Performance monitoring wrapper
interface PerformanceWrapperProps {
  name: string
  children: ReactNode
  tags?: Record<string, string>
}

export function PerformanceWrapper({ name, children, tags }: PerformanceWrapperProps) {
  const [monitoring, setMonitoring] = React.useState<MonitoringService | null>(null)
  const startTime = React.useRef<number>()

  useEffect(() => {
    try {
      const monitoringInstance = require('@/lib/monitoring').getMonitoring()
      setMonitoring(monitoringInstance)
    } catch (error) {
      console.warn('Monitoring not available for performance wrapper')
    }
  }, [])

  useEffect(() => {
    if (!monitoring) return

    startTime.current = performance.now()

    return () => {
      if (startTime.current) {
        const duration = performance.now() - startTime.current
        monitoring.trackMetric({
          name: `component.performance.${name}`,
          value: duration,
          tags
        })
      }
    }
  }, [monitoring, name, tags])

  return <>{children}</>
}
