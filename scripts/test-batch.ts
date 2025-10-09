#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { processPricesBatch } from '../src/workers/batch-processor';
import { getRedis } from '../src/lib/redis';
import { PrismaClient } from '@prisma/client';

// Load environment variables
config();

const prisma = new PrismaClient();

async function testBatch() {
  try {
    console.log('Testing batch processor...');
    await processPricesBatch(['AAPL', 'MSFT'], '2025-10-08');
    console.log('Batch processor test completed successfully');
  } catch (error: any) {
    console.error('Batch processor test failed:', error);
    process.exit(1);
  }
}

testBatch()
  .then(async () => {
    try { await getRedis().quit(); } catch {}
    try { await prisma.$disconnect(); } catch {}
  })
  .finally(() => {
    // poistka, keby niečo ešte držalo loop
    setTimeout(() => process.exit(0), 100).unref();
  });
