import { NextRequest, NextResponse } from 'next/server';
import { getJSON } from '@/lib/redis';
import { logger } from '@/lib/logger';

interface PublishMeta {
  day: string;
  publishedAt: string;
  coverage: {
    schedule: number;
    price: number;
    epsRev: number;
  };
  status: 'staging' | 'published' | 'delayed';
}

/**
 * Get latest publish metadata
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const metaKey = 'earnings:latest:meta';
    
    logger.info('Fetching latest publish metadata', { key: metaKey });

    const meta = await getJSON<PublishMeta>(metaKey);
    
    if (!meta) {
      logger.warn('No publish metadata found', { key: metaKey });
      
      return NextResponse.json({
        status: 'not_found',
        message: 'No publish metadata available'
      }, { status: 404 });
    }

    logger.info('Successfully served publish metadata', meta);

    return NextResponse.json({
      status: 'success',
      data: meta
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    logger.error('Error in earnings/meta API:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error'
    }, { status: 500 });
  }
}
