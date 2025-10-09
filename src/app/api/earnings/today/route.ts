import { NextRequest, NextResponse } from 'next/server';
import { getJSON, exists } from '@/lib/redis';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PublishedData {
  day: string;
  publishedAt: string;
  coverage: {
    schedule: number;
    price: number;
    epsRev: number;
  };
  data: any[];
  flags: string[];
}

interface ApiResponse {
  status: 'success' | 'delayed' | 'error';
  source: 'redis' | 'fallback';
  day: string;
  freshness: {
    ageMinutes: number;
    publishedAt: string;
  };
  coverage: {
    schedule: number;
    price: number;
    epsRev: number;
  };
  data: any[];
  flags: string[];
  message?: string;
}

/**
 * Get today's earnings data from Redis published snapshot
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get today's date in US/Eastern timezone
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const today = easternTime.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const publishedKey = `earnings:${today}:published`;
    
    logger.info(`Fetching published data for ${today}`, { key: publishedKey });

    // Check if published data exists
    const hasPublished = await exists(publishedKey);
    
    if (!hasPublished) {
      logger.warn(`No published data found for ${today}`, { key: publishedKey });
      
      const response: ApiResponse = {
        status: 'delayed',
        source: 'redis',
        day: today,
        freshness: {
          ageMinutes: 0,
          publishedAt: ''
        },
        coverage: {
          schedule: 0,
          price: 0,
          epsRev: 0
        },
        data: [],
        message: 'No published snapshot available'
      };

      return NextResponse.json(response, {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // Get published data
    const publishedData = await getJSON<PublishedData>(publishedKey);
    
    if (!publishedData) {
      logger.error(`Failed to parse published data for ${today}`, { key: publishedKey });
      
      const response: ApiResponse = {
        status: 'error',
        source: 'redis',
        day: today,
        freshness: {
          ageMinutes: 0,
          publishedAt: ''
        },
        coverage: {
          schedule: 0,
          price: 0,
          epsRev: 0
        },
        data: [],
        message: 'Failed to parse published data'
      };

      return NextResponse.json(response, { status: 500 });
    }

    // Calculate freshness
    const publishedAt = new Date(publishedData.publishedAt);
    const ageMinutes = Math.round((now.getTime() - publishedAt.getTime()) / (1000 * 60));

    const response: ApiResponse = {
      status: 'success',
      source: 'redis',
      day: publishedData.day,
      freshness: {
        ageMinutes,
        publishedAt: publishedData.publishedAt
      },
      coverage: publishedData.coverage,
      data: publishedData.data,
      flags: publishedData.flags || []
    };

    logger.info(`Successfully served published data for ${today}`, {
      ageMinutes,
      dataCount: publishedData.data.length,
      coverage: publishedData.coverage
    });

    const res = NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    return res;

  } catch (error) {
    logger.error('Error in earnings/today API:', error);
    
    const response: ApiResponse = {
      status: 'error',
      source: 'redis',
      day: new Date().toISOString().split('T')[0],
      freshness: {
        ageMinutes: 0,
        publishedAt: ''
      },
      coverage: {
        schedule: 0,
        price: 0,
        epsRev: 0
      },
      data: [],
      message: 'Internal server error'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
