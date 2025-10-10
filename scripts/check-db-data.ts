#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  console.log('🔍 Checking database data...');
  
  const earnings = await prisma.earningsTickersToday.findMany({
    select: { ticker: true, reportDate: true }
  });
  
  console.log('📊 EarningsTickersToday records:', earnings.length);
  earnings.forEach(e => console.log('  -', e.ticker, e.reportDate.toISOString()));
  
  const today = new Date('2025-10-10T00:00:00.000Z');
  const tomorrow = new Date('2025-10-11T00:00:00.000Z');
  
  const todayEarnings = await prisma.earningsTickersToday.findMany({
    where: {
      reportDate: {
        gte: today,
        lt: tomorrow
      }
    },
    select: { ticker: true, reportDate: true }
  });
  
  console.log('📅 Today earnings (2025-10-10):', todayEarnings.length);
  todayEarnings.forEach(e => console.log('  -', e.ticker, e.reportDate.toISOString()));
  
  await prisma.$disconnect();
}

checkData().catch(console.error);
