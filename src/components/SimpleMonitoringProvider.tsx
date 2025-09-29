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

// Simple Error Boundary - Functional version
interface SimpleErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

export function SimpleErrorBoundary({ children, fallback }: SimpleErrorBoundaryProps) {
  // For now, just return children without error boundary
  // In production, you might want to use a proper error boundary library
  return <>{children}</>
}
