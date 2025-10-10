#!/usr/bin/env tsx

import { buildLiveOrMockEarnings } from '../src/app/api/earnings/_shared/buildEarnings'

async function testLiveData() {
  console.log('🧪 Testing live data fetching...')
  console.log('ENV: USE_MOCK_EARNINGS=', process.env.USE_MOCK_EARNINGS)
  
  const result = await buildLiveOrMockEarnings()
  
  console.log('\n📊 Results:')
  console.log('  Count:', result.data.length)
  console.log('  Sample:', result.data.slice(0, 3).map(d => d.ticker))
  console.log('  Stats total:', result.meta.stats?.totalEarnings)
  console.log('  Has stats:', result.meta.stats !== null)
}

testLiveData().catch(console.error)


