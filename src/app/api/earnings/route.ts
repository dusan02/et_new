import { NextRequest, NextResponse } from 'next/server'
import { buildEarningsWithFallback } from './_shared/buildEarnings'
import { recordApiLatency, recordApiCount, recordApiError, recordEarningsPublish } from '@/lib/observability'

// ✅ FIX: Vypni všetky cache vrstvy
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('[API][ENV] NODE_ENV=', process.env.NODE_ENV, 'USE_MOCK_EARNINGS=', process.env.USE_MOCK_EARNINGS, 'USE_MOCK=', process.env.USE_MOCK_EARNINGS === '1')

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const debugMode = searchParams.get('debug') === '1'
    const noCache = searchParams.get('nocache') === '1'

    // Build unified earnings data (mock or live)
    const payload = await buildEarningsWithFallback()
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    // Record metrics
    recordApiLatency('/api/earnings', duration)
    recordApiCount('/api/earnings', 'success')
    recordEarningsPublish(payload.data.length)

    const response = NextResponse.json({
      status: 'success',
      data: payload.data,
      meta: payload.meta
    })

    // Add cache headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('Surrogate-Control', 'no-store')
    
    if (debugMode) {
      response.headers.set('x-debug', 'enabled')
      response.headers.set('x-mock-mode', process.env.USE_MOCK_EARNINGS === '1' ? 'true' : 'false')
    }

    console.log(`[API][UNIFIED] count=${payload.data.length} hasStats=${payload.meta.stats !== null}`)

    return response

  } catch (error) {
    const endTime = Date.now()
    const duration = endTime - startTime
    
    // Record error metrics
    recordApiLatency('/api/earnings', duration)
    recordApiCount('/api/earnings', 'error')
    recordApiError('/api/earnings', error instanceof Error ? error.message : 'Unknown error')
    
    console.error('[API][earnings] error:', error)
    
    // Return 200 with empty data instead of 500
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Temporary unavailable',
        data: [],
        meta: {
          total: 0,
          ready: false,
          date: new Date().toISOString().split('T')[0],
          lastUpdated: new Date().toISOString(),
          stats: {
            totalEarnings: 0,
            withEps: 0,
            withRevenue: 0,
            sizeDistribution: [
              { size: 'Mega', _count: { size: 0 }, _sum: { marketCap: 0 } },
              { size: 'Large', _count: { size: 0 }, _sum: { marketCap: 0 } },
              { size: 'Mid', _count: { size: 0 }, _sum: { marketCap: 0 } },
              { size: 'Small', _count: { size: 0 }, _sum: { marketCap: 0 } }
            ],
            topGainers: [],
            topLosers: [],
            epsBeat: null,
            revenueBeat: null,
            epsMiss: null,
            revenueMiss: null
          }
        }
      },
      { 
        status: 200, 
        headers: { 'Cache-Control': 'no-store' }
      }
    )
  }
}