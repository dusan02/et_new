#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { processEpsRevBatch } from '../src/workers/batch-processor';
import { getRedis } from '../src/lib/redis';
import { PrismaClient } from '@prisma/client';

// Load environment variables
config();

const prisma = new PrismaClient();

async function testEpsRevBatch() {
  try {
    console.log('Testing EPS/REV batch processor...');
    await processEpsRevBatch(['AAPL', 'MSFT'], '2025-10-08');
    console.log('EPS/REV batch processor test completed successfully');
  } catch (error: any) {
    console.error('EPS/REV batch processor test failed:', error);
    process.exit(1);
  }
}

testEpsRevBatch()
  .then(async () => {
    try { await getRedis().quit(); } catch {}
    try { await prisma.$disconnect(); } catch {}
  })
  .finally(() => {
    // poistka, keby niečo ešte držalo loop
    setTimeout(() => process.exit(0), 100).unref();
  });
