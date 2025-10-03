import { sanitizeEarningsData } from '@/utils/sanitize-earnings';

describe('sanitizeEarningsData', () => {
  it('CATX: EPS dup (-0.33 = -0.33) → actual=null', () => {
    const row = sanitizeEarningsData({
      ticker: 'CATX',
      epsActual: -0.33,
      epsEstimate: -0.33,
      revenueActual: 207_672_000_000,
      revenueEstimate: 207_672_000_000,
    });
    expect(row.epsActual).toBeNull();
    expect(row.revenueActual).toBeNull();
  });

  it('LFCR: EPS dup (-0.32 = -0.32), REV dup (26.79M = 26.79M) → actual=null', () => {
    const row = sanitizeEarningsData({
      ticker: 'LFCR',
      epsActual: -0.32,
      epsEstimate: -0.32,
      revenueActual: 26_790_000,  // example "full units"
      revenueEstimate: 26_790_000
    });
    expect(row.epsActual).toBeNull();
    expect(row.revenueActual).toBeNull();
  });

  it('Revenue unit-mismatch: 207672 (thousands?) vs 207_672_000_000 (full) → actual=null', () => {
    const row = sanitizeEarningsData({
      ticker: 'CATX',
      epsActual: null,
      epsEstimate: -0.33,
      revenueActual: 207_672_000_000,
      revenueEstimate: 207_672, // from API (thousands)
    });
    expect(row.revenueActual).toBeNull();
  });

  it('Legit difference: EPS -0.33 vs -0.31 → keep', () => {
    const row = sanitizeEarningsData({
      ticker: 'XYZ',
      epsActual: -0.31,
      epsEstimate: -0.33,
      revenueActual: 5_000_000,
      revenueEstimate: 4_900_000
    });
    expect(row.epsActual).toBe(-0.31);
    expect(row.revenueActual).toBe(5_000_000);
  });

  it('Float precision: EPS -0.3300001 vs -0.33 → actual=null', () => {
    const row = sanitizeEarningsData({
      ticker: 'TEST',
      epsActual: -0.3300001,
      epsEstimate: -0.33,
      revenueActual: null,
      revenueEstimate: null
    });
    expect(row.epsActual).toBeNull();
  });
});
