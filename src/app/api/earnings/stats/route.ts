import { NextRequest, NextResponse } from 'next/server'
import { buildEarningsWithFallback } from '../_shared/buildEarnings'

// ✅ FIX: Vypni všetky cache vrstvy
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    console.log('[STATS][ENV] USE_MOCK=', process.env.USE_MOCK_EARNINGS)

    // Build unified earnings data (mock or live) - single source of truth
    const payload = await buildEarningsWithFallback()

    const response = NextResponse.json({
      status: 'success',
      data: payload.meta.stats,
      meta: {
        total: payload.meta.total,
        ready: payload.meta.ready,
        date: payload.meta.date,
        lastUpdated: payload.meta.lastUpdated
      }
    })

    // Add cache headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('Surrogate-Control', 'no-store')

    console.log(`[STATS][UNIFIED] totalEarnings=${payload.meta.stats?.totalEarnings || 0} topGainer=${payload.meta.stats?.topGainers?.[0]?.ticker || 'none'}`)

    return response

  } catch (error) {
    console.error('[STATS] error:', error)
    
    // Return 200 with empty stats instead of 500
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Temporary unavailable',
        data: {
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
        },
        meta: {
          total: 0,
          ready: false,
          date: new Date().toISOString().split('T')[0],
          lastUpdated: new Date().toISOString()
        }
      },
      { 
        status: 200, 
        headers: { 'Cache-Control': 'no-store' }
      }
    )
  }
}