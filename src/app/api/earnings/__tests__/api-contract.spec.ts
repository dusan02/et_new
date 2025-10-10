import { describe, test, expect } from '@jest/globals';

// Fetch polyfill for Jest
const fetch = globalThis.fetch || require('node-fetch');

describe('API Contract Tests', () => {
  test('earnings API returns valid data structure', async () => {
    const response = await fetch('http://localhost:3000/api/earnings');
    
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    
    // Basic structure validation
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('meta');
    expect(data.status).toBe('success');
    expect(Array.isArray(data.data)).toBe(true);
    
    // Validate each earnings item structure
    for (const item of data.data) {
      // Required string fields
      expect(typeof item.ticker).toBe('string');
      expect(item.ticker.length).toBeGreaterThan(0);
      
      // Optional string fields
      if (item.companyName !== null) {
        expect(typeof item.companyName).toBe('string');
      }
      if (item.reportTime !== null) {
        expect(typeof item.reportTime).toBe('string');
      }
      
      // Numeric fields must be number | null (not BigInt, not string)
      const numericFields = [
        'revenueActual',
        'revenueEstimate', 
        'currentPrice',
        'previousClose',
        'priceChangePercent',
        'marketCap',
        'marketCapDiffBillions',
        'epsActual',
        'epsEstimate'
      ];
      
      for (const field of numericFields) {
        if (item[field] !== null && item[field] !== undefined) {
          expect(typeof item[field]).toBe('number');
          expect(Number.isFinite(item[field])).toBe(true);
        }
      }
      
      // Revenue sanity check
      if (item.revenueActual !== null) {
        expect(item.revenueActual).toBeLessThan(1e12); // < 1T
      }
      if (item.revenueEstimate !== null) {
        expect(item.revenueEstimate).toBeLessThan(1e12); // < 1T
      }
      
      // Price change sanity check
      if (item.priceChangePercent !== null) {
        expect(Math.abs(item.priceChangePercent)).toBeLessThanOrEqual(50); // <= 50%
      }
      
      // Price data consistency
      if (item.currentPrice !== null) {
        expect(item.previousClose).not.toBeNull();
        expect(item.previousClose).toBeGreaterThan(0);
      }
    }
  });
  
  test('earnings API meta structure is valid', async () => {
    const response = await fetch('http://localhost:3000/api/earnings');
    const data = await response.json();
    
    expect(data.meta).toHaveProperty('total');
    expect(data.meta).toHaveProperty('timestamp');
    expect(typeof data.meta.total).toBe('number');
    expect(data.meta.total).toBe(data.data.length);
    
    // Optional meta fields
    if (data.meta.note) {
      expect(typeof data.meta.note).toBe('string');
    }
  });
  
  test('earnings stats API returns valid structure', async () => {
    const response = await fetch('http://localhost:3000/api/earnings/stats');
    
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('data');
    expect(data.status).toBe('success');
    
    const stats = data.data;
    expect(typeof stats.totalEarnings).toBe('number');
    expect(typeof stats.withEps).toBe('number');
    expect(typeof stats.withRevenue).toBe('number');
    expect(Array.isArray(stats.sizeDistribution)).toBe(true);
  });
  
  test('API handles edge cases gracefully', async () => {
    // Test with nocache parameter
    const response = await fetch('http://localhost:3000/api/earnings?nocache=1');
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.status).toBe('success');
    expect(Array.isArray(data.data)).toBe(true);
  });
});
