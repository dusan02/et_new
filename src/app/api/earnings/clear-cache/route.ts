import { NextRequest, NextResponse } from 'next/server'
import { createJsonResponse, stringifyHeaders } from '@/lib/json-utils'
import { clearCache } from '@/lib/cache-utils'

export async function POST(request: NextRequest) {
  try {
    console.log('[CACHE] Manual cache clear requested')
    
    // Clear all cache (cache-utils uses a single Map)
    const totalCleared = clearCache()
    
    console.log(`[CACHE] Cleared ${totalCleared} cache entries`)
    
    const payload = {
      status: 'success',
      message: 'Cache cleared successfully',
      clearedEntries: totalCleared,
      timestamp: new Date().toISOString()
    }
    
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    }
    
    return createJsonResponse(payload, stringifyHeaders(headers))
    
  } catch (error) {
    console.error('[CACHE] Error clearing cache:', error)
    
    const payload = {
      status: 'error',
      message: 'Failed to clear cache',
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }
    
    return createJsonResponse(payload, stringifyHeaders({}), { status: 500 })
  }
}