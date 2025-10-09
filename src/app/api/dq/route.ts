import { NextRequest, NextResponse } from 'next/server';
import { getJSON } from '@/lib/redis';
import { logger } from '@/lib/logger';

interface DQResponse {
  status: 'success' | 'not_found' | 'error';
  day: string;
  coverage: {
    schedule: number;
    price: number;
    epsRev: number;
  };
  thresholds: {
    schedule: number;
    price: number;
    epsRev: number;
  };
  passes: boolean;
  lastUpdated: string;
  publishStatus: string;
  publishedAt?: string;
}

/**
 * Get data quality coverage information
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const day = searchParams.get('day');
    
    // Default to today if no day specified
    const targetDay = day || new Date().toISOString().split('T')[0];
    const dqKey = `dq:coverage:${targetDay}`;
    
    logger.info('Fetching DQ coverage data', { key: dqKey, day: targetDay });

    // Get coverage data from Redis (fallback to mock data)
    const dqData = await getJSON(`dq:coverage:${targetDay}`);
    
    if (!dqData) {
      logger.warn('No DQ coverage data found', { day: targetDay });
      
      // Return mock data for testing
      const coverage = {
        schedule: 0,
        price: 0,
        epsRev: 0
      };

      const thresholds = {
        schedule: 95,
        price: 98,
        epsRev: 90
      };

      const passes = coverage.price >= thresholds.price;

      const response: DQResponse = {
        status: 'not_found',
        day: targetDay,
        coverage,
        thresholds,
        passes,
        lastUpdated: new Date().toISOString(),
        publishStatus: 'staging'
      };

      return NextResponse.json(response, { status: 200 });
    }

    const coverage = dqData.coverage || { schedule: 0, price: 0, epsRev: 0 };
    const thresholds = dqData.thresholds || { schedule: 95, price: 98, epsRev: 90 };
    const passes = coverage.price >= thresholds.price;

    const response: DQResponse = {
      status: 'success',
      day: targetDay,
      coverage,
      thresholds,
      passes,
      lastUpdated: dqData.lastUpdated || new Date().toISOString(),
      publishStatus: dqData.status || 'staging',
      publishedAt: dqData.publishedAt
    };

    logger.info('Successfully served DQ coverage data', response);

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    logger.error('Error in DQ API:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error'
    }, { status: 500 });
  }
}
