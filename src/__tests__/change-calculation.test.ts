import { PriceCalculator } from '@/modules/market-data/utils/price-calculator'

describe('Price Change Calculation', () => {
  test('should calculate positive change correctly', () => {
    const result = PriceCalculator.calculatePriceChange(142.70, 142.20)
    expect(result).toBeCloseTo(0.3516, 4)
  })

  test('should calculate negative change correctly', () => {
    const result = PriceCalculator.calculatePriceChange(30.94, 31.02)
    expect(result).toBeCloseTo(-0.258, 3)
  })

  test('should calculate large positive change correctly', () => {
    const result = PriceCalculator.calculatePriceChange(2.84, 2.63)
    expect(result).toBeCloseTo(7.98, 2)
  })

  test('should return null for invalid inputs', () => {
    expect(PriceCalculator.calculatePriceChange(null, 142.20)).toBeNull()
    expect(PriceCalculator.calculatePriceChange(142.70, null)).toBeNull()
    expect(PriceCalculator.calculatePriceChange(142.70, 0)).toBeNull()
    expect(PriceCalculator.calculatePriceChange(142.70, -1)).toBeNull()
    expect(PriceCalculator.calculatePriceChange(NaN, 142.20)).toBeNull()
    expect(PriceCalculator.calculatePriceChange(142.70, NaN)).toBeNull()
  })

  test('should handle zero change', () => {
    const result = PriceCalculator.calculatePriceChange(100.00, 100.00)
    expect(result).toBe(0)
  })

  test('should handle very small changes', () => {
    const result = PriceCalculator.calculatePriceChange(100.01, 100.00)
    expect(result).toBeCloseTo(0.01, 2)
  })
})
