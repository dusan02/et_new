import { NextResponse } from 'next/server'
import { clearCache } from '@/lib/cache-utils'

export async function POST() {
  try {
    clearCache()
    return NextResponse.json({ 
      success: true, 
      message: 'Cache cleared successfully' 
    })
  } catch (error) {
    console.error('Failed to clear cache:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to clear cache' },
      { status: 500 }
    )
  }
}
