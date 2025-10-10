#!/usr/bin/env tsx

/**
 * 🔍 Debug API Environment
 * Test to see what environment the API server is using
 */

import { PrismaClient } from '@prisma/client'
import url from 'node:url'

async function debugApiEnv() {
  console.log('🔍 [DEBUG-ENV] Starting environment debug...')
  
  // Test environment variables
  const dbUrl = process.env.DATABASE_URL || ''
  const host = (() => { 
    try { 
      return url.parse(dbUrl)?.host || 'unknown' 
    } catch { 
      return 'unknown' 
    } 
  })()
  
  console.log('[DEBUG-ENV] NODE_ENV=', process.env.NODE_ENV)
  console.log('[DEBUG-ENV] DB_HOST=', host)
  console.log('[DEBUG-ENV] DB_URL=', dbUrl.substring(0, 50) + '...')
  
  // Test database connection
  const prisma = new PrismaClient()
  
  try {
    // Test basic connection
    await prisma.$connect()
    console.log('✅ [DEBUG-ENV] Database connection successful')
    
    // Test EarningsTickersToday table
    const count = await prisma.earningsTickersToday.count()
    console.log(`📊 [DEBUG-ENV] EarningsTickersToday count: ${count}`)
    
    // Test today's data
    const today = new Date().toISOString().split('T')[0]
    const start = new Date(today + 'T00:00:00.000Z')
    const end = new Date(today + 'T23:59:59.999Z')
    
    const todayCount = await prisma.earningsTickersToday.count({
      where: {
        reportDate: {
          gte: start,
          lte: end
        }
      }
    })
    
    console.log(`📅 [DEBUG-ENV] Today's data count: ${todayCount}`)
    console.log(`📅 [DEBUG-ENV] Date range: ${start.toISOString()} → ${end.toISOString()}`)
    
    if (todayCount > 0) {
      const sample = await prisma.earningsTickersToday.findMany({
        where: {
          reportDate: {
            gte: start,
            lte: end
          }
        },
        select: {
          ticker: true,
          reportDate: true
        },
        take: 3
      })
      
      console.log(`📋 [DEBUG-ENV] Sample data:`, sample)
    }
    
  } catch (error) {
    console.error('❌ [DEBUG-ENV] Database error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugApiEnv().catch(console.error)
