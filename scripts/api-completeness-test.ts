#!/usr/bin/env tsx

/**
 * 🧪 API COMPLETENESS TEST
 * 
 * Tento skript overí, či API vracia všetky potrebné polia
 * a či sú dáta kompletné
 */

async function testApiCompleteness() {
  try {
    console.log('🧪 Starting API completeness test...')
    
    // Test hlavného API endpointu
    const response = await fetch('http://localhost:3000/api/earnings?nocache=1')
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    const items = data.data || []
    
    console.log(`📊 [API-CHECK] Response contains ${items.length} items`)
    
    if (items.length === 0) {
      console.warn('⚠️ [API-CHECK] No items in response - this might be expected if no earnings today')
      return
    }
    
    // Overenie povinných polí
    const requiredFields = ['ticker', 'epsEstimate', 'revenueEstimate', 'reportTime']
    const missingFields: string[] = []
    
    items.forEach((item: any, index: number) => {
      requiredFields.forEach(field => {
        if (!(field in item)) {
          missingFields.push(`Item ${index} (${item.ticker || 'unknown'}): missing ${field}`)
        }
      })
    })
    
    if (missingFields.length > 0) {
      console.error('❌ [API-CHECK] Missing required fields:')
      missingFields.forEach(field => console.error(`  - ${field}`))
      process.exit(1)
    }
    
    // Overenie dátových typov
    const typeErrors: string[] = []
    
    items.forEach((item: any, index: number) => {
      if (item.ticker && typeof item.ticker !== 'string') {
        typeErrors.push(`Item ${index}: ticker should be string, got ${typeof item.ticker}`)
      }
      
      if (item.epsEstimate !== null && typeof item.epsEstimate !== 'number') {
        typeErrors.push(`Item ${index}: epsEstimate should be number or null, got ${typeof item.epsEstimate}`)
      }
      
      if (item.revenueEstimate !== null && typeof item.revenueEstimate !== 'number') {
        typeErrors.push(`Item ${index}: revenueEstimate should be number or null, got ${typeof item.revenueEstimate}`)
      }
    })
    
    if (typeErrors.length > 0) {
      console.error('❌ [API-CHECK] Type errors:')
      typeErrors.forEach(error => console.error(`  - ${error}`))
      process.exit(1)
    }
    
    // Overenie meta informácií
    const meta = data.meta || {}
    const expectedMetaFields = ['total', 'ready', 'date', 'fallbackUsed']
    
    expectedMetaFields.forEach(field => {
      if (!(field in meta)) {
        console.error(`❌ [API-CHECK] Missing meta field: ${field}`)
        process.exit(1)
      }
    })
    
    console.log('✅ [API-CHECK] All required fields present')
    console.log('✅ [API-CHECK] Data types are correct')
    console.log('✅ [API-CHECK] Meta information complete')
    console.log(`🎯 [API-CHECK] API completeness test PASSED for ${items.length} items`)
    
  } catch (error) {
    console.error('❌ [API-CHECK] ERROR:', error)
    process.exit(1)
  }
}

// Spusti ak je volaný priamo
if (require.main === module) {
  testApiCompleteness()
}
