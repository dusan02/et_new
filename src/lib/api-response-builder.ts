/**
 * 🔧 API Response Builder
 * Centralized utility for consistent API responses across all endpoints
 */

import { NextResponse } from 'next/server'

export interface ApiResponse<T = any> {
  status: 'success' | 'error' | 'no-data'
  data?: T
  message?: string
  meta?: {
    total?: number
    ready?: boolean
    duration?: string
    date?: string
    requestedDate?: string
    fallbackUsed?: boolean
    cached?: boolean
    cacheAge?: number
    [key: string]: any
  }
  timestamp: string
}

export class ApiResponseBuilder {
  /**
   * Create a successful response
   */
  static success<T>(data: T, meta?: ApiResponse<T>['meta']): NextResponse<ApiResponse<T>> {
    return NextResponse.json({
      status: 'success',
      data,
      meta,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Create an error response
   */
  static error(
    message: string, 
    status = 500, 
    meta?: ApiResponse['meta']
  ): NextResponse<ApiResponse> {
    return NextResponse.json({
      status: 'error',
      message,
      meta,
      timestamp: new Date().toISOString()
    }, { status })
  }

  /**
   * Create a no-data response
   */
  static noData(
    message = 'No data available',
    meta?: ApiResponse['meta']
  ): NextResponse<ApiResponse> {
    return NextResponse.json({
      status: 'no-data',
      data: [],
      message,
      meta,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Create a cached response
   */
  static cached<T>(
    data: T, 
    cacheAge: number,
    meta?: ApiResponse<T>['meta']
  ): NextResponse<ApiResponse<T>> {
    return NextResponse.json({
      status: 'success',
      data,
      meta: {
        ...meta,
        cached: true,
        cacheAge
      },
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Create a response with performance metrics
   */
  static withMetrics<T>(
    data: T,
    startTime: number,
    meta?: ApiResponse<T>['meta']
  ): NextResponse<ApiResponse<T>> {
    const duration = Date.now() - startTime
    
    return NextResponse.json({
      status: 'success',
      data,
      meta: {
        ...meta,
        duration: `${duration}ms`
      },
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Create a validation error response
   */
  static validationError(
    errors: string[],
    meta?: ApiResponse['meta']
  ): NextResponse<ApiResponse> {
    return NextResponse.json({
      status: 'error',
      message: 'Validation failed',
      meta: {
        ...meta,
        validationErrors: errors
      },
      timestamp: new Date().toISOString()
    }, { status: 400 })
  }

  /**
   * Create a rate limit error response
   */
  static rateLimit(
    message = 'Rate limit exceeded',
    retryAfter?: number,
    meta?: ApiResponse['meta']
  ): NextResponse<ApiResponse> {
    const headers: Record<string, string> = {}
    if (retryAfter) {
      headers['Retry-After'] = retryAfter.toString()
    }

    return NextResponse.json({
      status: 'error',
      message,
      meta,
      timestamp: new Date().toISOString()
    }, { 
      status: 429,
      headers
    })
  }
}
