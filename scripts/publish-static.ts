#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { setJSON, initRedis } from '../src/lib/redis';
import { logger } from '../src/lib/logger';
import fs from 'fs';
import path from 'path';

// Load environment variables
config();

interface StaticData {
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

/**
 * Publish static snapshot to Redis
 */
async function publishStaticSnapshot(): Promise<void> {
  try {
    // Validate environment
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL environment variable is required');
    }
    
    // Initialize Redis connection
    initRedis();
    
    // Get today's date in US/Eastern timezone
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const today = easternTime.toISOString().split('T')[0];
    
    const dataPath = path.join(process.cwd(), 'data', 'published.json');
    
    logger.info('Publishing static snapshot', { 
      day: today, 
      dataPath 
    });

    // Check if data file exists
    if (!fs.existsSync(dataPath)) {
      logger.error('Static data file not found', { dataPath });
      process.exit(1);
    }

    // Read static data
    const staticData: StaticData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    // Update metadata
    staticData.day = today;
    staticData.publishedAt = now.toISOString();
    
    // Publish to Redis
    const publishedKey = `earnings:${today}:published`;
    const metaKey = 'earnings:latest:meta';
    
    await setJSON(publishedKey, staticData);
    await setJSON(metaKey, {
      day: today,
      publishedAt: staticData.publishedAt,
      coverage: staticData.coverage,
      status: 'published'
    });
    
    logger.info('Static snapshot published successfully', {
      day: today,
      dataCount: staticData.data.length,
      coverage: staticData.coverage,
      keys: [publishedKey, metaKey]
    });

    console.log('✅ Static snapshot published successfully!');
    console.log(`📊 Data: ${staticData.data.length} tickers`);
    console.log(`📈 Coverage: Schedule ${staticData.coverage.schedule}%, Price ${staticData.coverage.price}%, EPS/Rev ${staticData.coverage.epsRev}%`);
    console.log(`🔑 Redis keys: ${publishedKey}, ${metaKey}`);

  } catch (error) {
    logger.error('Failed to publish static snapshot:', error);
    console.error('❌ Failed to publish static snapshot:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  publishStaticSnapshot()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { publishStaticSnapshot };
