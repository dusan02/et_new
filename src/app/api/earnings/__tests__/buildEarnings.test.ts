import { describe, test, expect } from '@jest/globals';

// Mock the sanitize function and buildLiveData function
function sanitizeEarningsData(item: any) {
  // Revenue sanity check (< 1T = 1e12)
  if (item.revenueActual && item.revenueActual > 1e12) {
    item.revenueActual = null;
  }
  if (item.revenueEstimate && item.revenueEstimate > 1e12) {
    item.revenueEstimate = null;
  }

  // Price change percent recompute if both prices present
  if (item.currentPrice != null && item.previousClose && item.previousClose > 0) {
    const calculatedPercent = ((item.currentPrice - item.previousClose) / item.previousClose) * 100;
    item.priceChangePercent = Number(calculatedPercent.toFixed(6));
  }

  // Price change percent sanity check
  if (item.priceChangePercent && Math.abs(item.priceChangePercent) > 50) {
    item.priceChangePercent = null;
  }

  return item;
}

function buildLiveData(rawData: any[]) {
  return rawData.map(item => {
    const transformed = {
      ticker: item.ticker,
      companyName: item.marketData?.companyName || item.ticker,
      reportTime: item.reportTime,
      epsActual: item.epsActual,
      epsEstimate: item.epsEstimate,
      revenueActual: item.revenueActual ? Number(item.revenueActual) : null,
      revenueEstimate: item.revenueEstimate ? Number(item.revenueEstimate) : null,
      currentPrice: item.marketData?.currentPrice || null,
      previousClose: item.marketData?.previousClose || null,
      priceChangePercent: item.marketData?.priceChangePercent || null,
      marketCap: item.marketData?.marketCap || null,
      marketCapDiffBillions: item.marketData?.marketCapDiffBillions || null
    };
    
    return sanitizeEarningsData(transformed);
  });
}

describe('Earnings Data Conversion', () => {
  test('finnhub revenue stays in proper units', () => {
    const raw = [{
      ticker: 'CCEL',
      revenueActual: BigInt(8140620),   // 8.140.620
      revenueEstimate: BigInt(8140620),
      marketData: { 
        currentPrice: 4.43, 
        previousClose: 4.42, 
        priceChangePercent: 0.23,
        companyName: 'Cryo-Cell International Inc.'
      }
    }];
    
    const out = buildLiveData(raw);
    
    expect(out[0].revenueActual).toBe(8140620);
    expect(out[0].revenueEstimate).toBe(8140620);
    expect(out[0].ticker).toBe('CCEL');
  });

  test('prices are forwarded correctly', () => {
    const raw = [{ 
      ticker: 'HIFS', 
      marketData: { 
        currentPrice: 272.18, 
        previousClose: 271.0, 
        priceChangePercent: 0.43,
        companyName: 'Hingham Institution for Saving'
      } 
    }];
    
    const out = buildLiveData(raw);
    
    expect(out[0].currentPrice).toBe(272.18);
    expect(out[0].previousClose).toBe(271.0);
    // Price change gets recalculated: (272.18 - 271.0) / 271.0 * 100 = 0.435424
    expect(out[0].priceChangePercent).toBeCloseTo(0.435424, 5);
    expect(out[0].companyName).toBe('Hingham Institution for Saving');
  });

  test('sanity check removes extreme revenue values', () => {
    const raw = [{
      ticker: 'BAD',
      revenueActual: 1.5e12, // 1.5 trillion - should be nullified
      revenueEstimate: 2e12,  // 2 trillion - should be nullified
      marketData: { currentPrice: 100, previousClose: 100 }
    }];
    
    const out = buildLiveData(raw);
    
    expect(out[0].revenueActual).toBeNull();
    expect(out[0].revenueEstimate).toBeNull();
  });

  test('sanity check removes extreme price changes', () => {
    const raw = [{
      ticker: 'EXTREME',
      marketData: { 
        currentPrice: 100, 
        previousClose: 50, 
        priceChangePercent: 75 // > 50% - should be nullified
      }
    }];
    
    const out = buildLiveData(raw);
    
    expect(out[0].priceChangePercent).toBeNull();
  });

  test('price change percent is recalculated correctly', () => {
    const raw = [{
      ticker: 'CALC',
      marketData: { 
        currentPrice: 110, 
        previousClose: 100, 
        priceChangePercent: null // Will be recalculated
      }
    }];
    
    const out = buildLiveData(raw);
    
    expect(out[0].priceChangePercent).toBe(10.0); // (110-100)/100 * 100 = 10%
  });

  test('handles null values gracefully', () => {
    const raw = [{
      ticker: 'NULL',
      revenueActual: null,
      revenueEstimate: null,
      epsActual: null,
      epsEstimate: null,
      marketData: null
    }];
    
    const out = buildLiveData(raw);
    
    expect(out[0].revenueActual).toBeNull();
    expect(out[0].revenueEstimate).toBeNull();
    expect(out[0].currentPrice).toBeNull();
    expect(out[0].previousClose).toBeNull();
    expect(out[0].priceChangePercent).toBeNull();
  });

  test('BigInt conversion works correctly', () => {
    const raw = [{
      ticker: 'BIGINT',
      revenueActual: BigInt(1234567890),
      revenueEstimate: BigInt(9876543210),
      marketData: { currentPrice: 50.25, previousClose: 49.75 }
    }];
    
    const out = buildLiveData(raw);
    
    expect(out[0].revenueActual).toBe(1234567890);
    expect(out[0].revenueEstimate).toBe(9876543210);
    expect(typeof out[0].revenueActual).toBe('number');
    expect(typeof out[0].revenueEstimate).toBe('number');
  });
});
