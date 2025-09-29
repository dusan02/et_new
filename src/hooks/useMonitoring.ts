/**
 * 📊 React Hooks for Monitoring
 * Easy-to-use hooks for tracking metrics, errors, and user actions
 */

import { useCallback, useEffect, useRef } from 'react'
import { getMonitoring } from '@/lib/monitoring'

// Hook for tracking API calls
export function useAPIMonitoring() {
  return useCallback((endpoint: string, method: string, duration: number, statusCode: number) => {
    try {
      const monitoring = getMonitoring()
      monitoring.trackAPICall(endpoint, method, duration, statusCode)
    } catch (error) {
      console.warn('Monitoring not available:', error)
    }
  }, [])
}

// Hook for tracking user interactions
export function useUserTracking() {
  return useCallback((action: string, context?: Record<string, any>) => {
    try {
      const monitoring = getMonitoring()
      monitoring.trackUserAction(action, context)
    } catch (error) {
      console.warn('Monitoring not available:', error)
    }
  }, [])
}

// Hook for tracking errors
export function useErrorTracking() {
  return useCallback((error: Error, context?: Record<string, any>) => {
    try {
      const monitoring = getMonitoring()
      monitoring.trackError({ error, context })
    } catch (error) {
      console.warn('Monitoring not available:', error)
    }
  }, [])
}

// Hook for performance monitoring
export function usePerformanceTracking() {
  const startTime = useRef<number>()

  const start = useCallback((operationName: string) => {
    startTime.current = performance.now()
    return operationName
  }, [])

  const end = useCallback((operationName: string, tags?: Record<string, string>) => {
    if (!startTime.current) return

    const duration = performance.now() - startTime.current
    
    try {
      const monitoring = getMonitoring()
      monitoring.trackMetric({
        name: `performance.${operationName}`,
        value: duration,
        tags
      })
    } catch (error) {
      console.warn('Monitoring not available:', error)
    }

    startTime.current = undefined
  }, [])

  return { start, end }
}

// Hook for component lifecycle monitoring
export function useComponentTracking(componentName: string) {
  const performance = usePerformanceTracking()
  const trackUser = useUserTracking()

  useEffect(() => {
    const operationName = performance.start(`component.${componentName}.mount`)
    
    // Track component mount
    trackUser('component.mount', { component: componentName })

    return () => {
      // Track component unmount
      trackUser('component.unmount', { component: componentName })
      performance.end(operationName, { component: componentName })
    }
  }, [componentName, performance, trackUser])

  return {
    trackRender: useCallback(() => {
      trackUser('component.render', { component: componentName })
    }, [trackUser, componentName]),

    trackInteraction: useCallback((interaction: string, data?: any) => {
      trackUser('component.interaction', {
        component: componentName,
        interaction,
        ...data
      })
    }, [trackUser, componentName])
  }
}

// Hook for form tracking
export function useFormTracking(formName: string) {
  const trackUser = useUserTracking()
  const trackError = useErrorTracking()

  return {
    trackStart: useCallback(() => {
      trackUser('form.start', { form: formName })
    }, [trackUser, formName]),

    trackSubmit: useCallback((success: boolean, data?: any) => {
      trackUser('form.submit', {
        form: formName,
        success,
        ...data
      })
    }, [trackUser, formName]),

    trackFieldChange: useCallback((fieldName: string, value?: any) => {
      trackUser('form.field_change', {
        form: formName,
        field: fieldName,
        has_value: !!value
      })
    }, [trackUser, formName]),

    trackError: useCallback((error: Error, fieldName?: string) => {
      trackError(error, {
        form: formName,
        field: fieldName
      })
    }, [trackError, formName])
  }
}

// Hook for table/list monitoring
export function useTableTracking(tableName: string) {
  const trackUser = useUserTracking()
  const performance = usePerformanceTracking()

  return {
    trackSort: useCallback((column: string, direction: 'asc' | 'desc') => {
      trackUser('table.sort', {
        table: tableName,
        column,
        direction
      })
    }, [trackUser, tableName]),

    trackFilter: useCallback((filters: Record<string, any>) => {
      trackUser('table.filter', {
        table: tableName,
        filter_count: Object.keys(filters).length,
        filters: Object.keys(filters)
      })
    }, [trackUser, tableName]),

    trackPagination: useCallback((page: number, pageSize: number) => {
      trackUser('table.pagination', {
        table: tableName,
        page,
        page_size: pageSize
      })
    }, [trackUser, tableName]),

    trackRowClick: useCallback((rowId: string | number, rowData?: any) => {
      trackUser('table.row_click', {
        table: tableName,
        row_id: rowId,
        has_data: !!rowData
      })
    }, [trackUser, tableName]),

    trackRenderPerformance: useCallback((rowCount: number) => {
      const operation = performance.start(`table.${tableName}.render`)
      
      return () => {
        performance.end(operation, {
          table: tableName,
          row_count: rowCount.toString()
        })
      }
    }, [performance, tableName])
  }
}

// Hook for search tracking
export function useSearchTracking() {
  const trackUser = useUserTracking()

  return useCallback((query: string, results: number, duration?: number) => {
    trackUser('search.query', {
      query_length: query.length,
      has_results: results > 0,
      result_count: results,
      duration
    })
  }, [trackUser])
}

// Hook for cache monitoring
export function useCacheTracking() {
  return useCallback((operation: 'hit' | 'miss' | 'set' | 'delete', key: string) => {
    try {
      const monitoring = getMonitoring()
      monitoring.trackCacheOperation(operation, key)
    } catch (error) {
      console.warn('Monitoring not available:', error)
    }
  }, [])
}

// Hook for real-time health monitoring
export function useHealthMonitoring(intervalMs: number = 60000) {
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const monitoring = getMonitoring()
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
    }, intervalMs)

    return () => clearInterval(interval)
  }, [intervalMs])
}
