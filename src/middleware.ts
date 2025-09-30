import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Performance monitoring middleware
export function middleware(request: NextRequest) {
  const startTime = Date.now()
  
  // Log request details
  console.log(`[MIDDLEWARE] ${request.method} ${request.nextUrl.pathname} - ${new Date().toISOString()}`)
  
  // Add performance headers
  const response = NextResponse.next()
  
  // Add request ID for tracking
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  response.headers.set('X-Request-ID', requestId)
  
  // Add performance timing header
  response.headers.set('X-Response-Time', '0ms') // Will be updated after response
  
  return response
}

// Configure which paths to run middleware on
export const config = {
  matcher: [
    // vylúč statiky, obrázky a API/Next vnútorné cesty
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets|api/health).*)',
  ],
}
