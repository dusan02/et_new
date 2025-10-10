#!/usr/bin/env tsx

/**
 * 🧪 Test API with Fixed Date Range
 * Test the API logic with UTC date range
 */

import { PrismaClient } from '@prisma/client'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

async function testApiFixed() {
  console.log('🧪 Testing API with fixed date range...')
  
  const prisma = new PrismaClient()
  
  try {
    // Test UTC date range (same as API)
    const start = dayjs().utc().startOf('day').toDate()
    const end = dayjs().utc().endOf('day').toDate()
    
    console.log(`📅 Date range: ${start.toISOString()} → ${end.toISOString()}`)
    
    const rows = await prisma.earningsTickersToday.findMany({
      where: {
        reportDate: {
          gte: start,
          lte: end
        }
      },
      select: {
        ticker: true,
        reportDate: true
      }
    })
    
    console.log(`📊 Found ${rows.length} rows`)
    
    if (rows.length > 0) {
      console.log('📋 Sample data:', rows.slice(0, 3))
    } else {
      console.log('❌ No data found - checking all data...')
      
      const allRows = await prisma.earningsTickersToday.findMany({
        select: {
          ticker: true,
          reportDate: true
        },
        take: 5
      })
      
      console.log('📋 All data sample:', allRows)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testApiFixed()
