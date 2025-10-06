/**
 * Unit tests for price change calculations
 */

interface MarketData {
  currentPrice: number | null
  previousClose: number | null
}

function calcChange(data: MarketData): number | null {
  const { currentPrice, previousClose } = data
  
  if (currentPrice == null || previousClose == null || previousClose === 0) {
    return null
  }
  
  return ((currentPrice - previousClose) / previousClose) * 100
}

describe('calcChange', () => {
  test('calculates positive change correctly', () => {
    const data = { currentPrice: 110, previousClose: 100 }
    const result = calcChange(data)
    expect(result).toBe(10)
  })
  
  test('calculates negative change correctly', () => {
    const data = { currentPrice: 90, previousClose: 100 }
    const result = calcChange(data)
    expect(result).toBe(-10)
  })
  
  test('handles very small differences', () => {
    const data = { currentPrice: 100.01, previousClose: 100 }
    const result = calcChange(data)
    expect(result).toBeCloseTo(0.01, 5)
  })
  
  test('returns null when currentPrice is null', () => {
    const data = { currentPrice: null, previousClose: 100 }
    const result = calcChange(data)
    expect(result).toBeNull()
  })
  
  test('returns null when previousClose is null', () => {
    const data = { currentPrice: 100, previousClose: null }
    const result = calcChange(data)
    expect(result).toBeNull()
  })
  
  test('returns null when previousClose is zero', () => {
    const data = { currentPrice: 100, previousClose: 0 }
    const result = calcChange(data)
    expect(result).toBeNull()
  })
  
  test('handles zero change', () => {
    const data = { currentPrice: 100, previousClose: 100 }
    const result = calcChange(data)
    expect(result).toBe(0)
  })
  
  test('handles very small prices', () => {
    const data = { currentPrice: 0.0001, previousClose: 0.0001 }
    const result = calcChange(data)
    expect(result).toBe(0)
  })
  
  test('handles large price differences', () => {
    const data = { currentPrice: 200, previousClose: 100 }
    const result = calcChange(data)
    expect(result).toBe(100)
  })
})
