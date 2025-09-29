/**
 * 📊 Simple Monitoring Provider
 * Lightweight monitoring without complex hooks
 */

'use client'

import React, { createContext, useContext, ReactNode } from 'react'

interface SimpleMonitoringContextType {
  isEnabled: boolean
  log: (message: string, level?: 'info' | 'warn' | 'error') => void
  trackEvent: (event: string, data?: any) => void
}

const SimpleMonitoringContext = createContext<SimpleMonitoringContextType>({
  isEnabled: false,
  log: () => {},
  trackEvent: () => {}
})

interface SimpleMonitoringProviderProps {
  children: ReactNode
}

export function SimpleMonitoringProvider({ children }: SimpleMonitoringProviderProps) {
  const contextValue: SimpleMonitoringContextType = {
    isEnabled: typeof window !== 'undefined',
    log: (message: string, level: 'info' | 'warn' | 'error' = 'info') => {
      if (typeof window !== 'undefined') {
        console[level](`[MONITORING] ${message}`)
      }
    },
    trackEvent: (event: string, data?: any) => {
      if (typeof window !== 'undefined') {
        console.log(`[EVENT] ${event}`, data)
        
        // You can add DataDog/New Relic calls here later
        try {
          if ((window as any).gtag) {
            (window as any).gtag('event', event, data)
          }
        } catch (error) {
          // Ignore analytics errors
        }
      }
    }
  }

  return (
    <SimpleMonitoringContext.Provider value={contextValue}>
      {children}
    </SimpleMonitoringContext.Provider>
  )
}

export function useSimpleMonitoring() {
  return useContext(SimpleMonitoringContext)
}

// Simple Error Boundary
interface SimpleErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface SimpleErrorBoundaryState {
  hasError: boolean
}

export class SimpleErrorBoundary extends React.Component<
  SimpleErrorBoundaryProps,
  SimpleErrorBoundaryState
> {
  constructor(props: SimpleErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): SimpleErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              Please refresh the page to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
