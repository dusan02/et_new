// 🚫 GUIDANCE TESTS DISABLED - Guidance functionality is commented out for production
// import { 
//   normalizePeriod, 
//   periodsMatch, 
//   pctDiff, 
//   areMethodsCompatible, 
//   normalizeRevenueToUSD,
//   pickEpsSurprise 
// } from '../guidance';

// 🚫 GUIDANCE TESTS DISABLED - Guidance functionality is commented out for production
describe.skip('Guidance Utils', () => {
  describe('normalizePeriod', () => {
    test('should normalize common period formats', () => {
      expect(normalizePeriod('Q1')).toBe('Q1');
      expect(normalizePeriod('q2')).toBe('Q2');
      expect(normalizePeriod('3Q')).toBe('Q3');
      expect(normalizePeriod('4Q')).toBe('Q4');
      expect(normalizePeriod('H1')).toBe('H1');
      expect(normalizePeriod('1H')).toBe('H1');
      expect(normalizePeriod('H2')).toBe('H2');
      expect(normalizePeriod('2H')).toBe('H2');
      expect(normalizePeriod('FY')).toBe('FY');
    });

    test('should return null for invalid periods', () => {
      expect(normalizePeriod('INVALID')).toBe(null);
      expect(normalizePeriod('')).toBe(null);
      expect(normalizePeriod(null)).toBe(null);
    });
  });

  describe('periodsMatch', () => {
    test('should match identical periods and years', () => {
      expect(periodsMatch(
        { fiscalPeriod: 'Q1', fiscalYear: 2025 },
        { fiscalPeriod: 'Q1', fiscalYear: 2025 }
      )).toBe(true);
    });

    test('should not match different periods', () => {
      expect(periodsMatch(
        { fiscalPeriod: 'Q1', fiscalYear: 2025 },
        { fiscalPeriod: 'Q2', fiscalYear: 2025 }
      )).toBe(false);
    });

    test('should not match different years', () => {
      expect(periodsMatch(
        { fiscalPeriod: 'Q1', fiscalYear: 2025 },
        { fiscalPeriod: 'Q1', fiscalYear: 2026 }
      )).toBe(false);
    });

    test('should not match FY vs Q', () => {
      expect(periodsMatch(
        { fiscalPeriod: 'FY', fiscalYear: 2025 },
        { fiscalPeriod: 'Q1', fiscalYear: 2025 }
      )).toBe(false);
    });

    test('should not match H1 vs H2', () => {
      expect(periodsMatch(
        { fiscalPeriod: 'H1', fiscalYear: 2025 },
        { fiscalPeriod: 'H2', fiscalYear: 2025 }
      )).toBe(false);
    });

    test('should match H1 vs H1 same year', () => {
      expect(periodsMatch(
        { fiscalPeriod: 'H1', fiscalYear: 2025 },
        { fiscalPeriod: 'H1', fiscalYear: 2025 }
      )).toBe(true);
    });
  });

  describe('pctDiff', () => {
    test('should calculate percentage difference correctly', () => {
      expect(pctDiff(6.46, 2.18)).toBeCloseTo(196.33, 1);
      expect(pctDiff(2.18, 6.46)).toBeCloseTo(-66.25, 1);
    });

    test('should return null for zero denominator', () => {
      expect(pctDiff(5, 0)).toBe(null);
    });

    test('should return null for very small denominator (epsilon guard)', () => {
      expect(pctDiff(5, 0.000001)).toBe(null);
    });

    test('should return null for non-finite values', () => {
      expect(pctDiff(NaN, 5)).toBe(null);
      expect(pctDiff(5, Infinity)).toBe(null);
    });
  });

  describe('areMethodsCompatible', () => {
    test('should match identical methods', () => {
      expect(areMethodsCompatible('gaap', 'gaap')).toBe(true);
      expect(areMethodsCompatible('adj', 'adj')).toBe(true);
    });

    test('should match GAAP variants', () => {
      expect(areMethodsCompatible('gaap', 'reported')).toBe(true);
      expect(areMethodsCompatible('reported', 'reported_gaap')).toBe(true);
    });

    test('should match Non-GAAP variants', () => {
      expect(areMethodsCompatible('adj', 'adjusted')).toBe(true);
      expect(areMethodsCompatible('non-gaap', 'operating')).toBe(true);
    });

    test('should not match mixed methods', () => {
      expect(areMethodsCompatible('gaap', 'adj')).toBe(false);
      expect(areMethodsCompatible('reported', 'non-gaap')).toBe(false);
    });

    test('should assume compatible for unknown methods', () => {
      expect(areMethodsCompatible(null, 'gaap')).toBe(true);
      expect(areMethodsCompatible('gaap', null)).toBe(true);
    });
  });

  describe('normalizeRevenueToUSD', () => {
    test('should handle BigInt values', () => {
      expect(normalizeRevenueToUSD(BigInt(1000000))).toBe(1000000);
    });

    test('should handle string values with suffixes', () => {
      expect(normalizeRevenueToUSD('1.5K')).toBe(1500);
      expect(normalizeRevenueToUSD('2.5M')).toBe(2500000);
      expect(normalizeRevenueToUSD('1.2B')).toBe(1200000000);
    });

    test('should handle number values', () => {
      expect(normalizeRevenueToUSD(1000000)).toBe(1000000);
    });

    test('should return null for invalid values', () => {
      expect(normalizeRevenueToUSD('invalid')).toBe(null);
      expect(normalizeRevenueToUSD(null)).toBe(null);
    });
  });

  describe('pickEpsSurprise', () => {
    test('should calculate surprise for matching periods', () => {
      const result = pickEpsSurprise({
        guide: 6.46,
        est: 2.18,
        gFiscal: { fiscalPeriod: 'Q1', fiscalYear: 2025 },
        eFiscal: { fiscalPeriod: 'Q1', fiscalYear: 2025 }
      });
      
      expect(result.value).toBeCloseTo(196.33, 1);
      expect(result.basis).toBe('estimate');
      expect(result.extreme).toBe(false);
    });

    test('should return null for non-matching periods', () => {
      const result = pickEpsSurprise({
        guide: 6.46,
        est: 2.18,
        gFiscal: { fiscalPeriod: 'FY', fiscalYear: 2025 },
        eFiscal: { fiscalPeriod: 'Q1', fiscalYear: 2025 }
      });
      
      expect(result.value).toBe(null);
      expect(result.basis).toBeUndefined();
    });

    test('should return null for incompatible methods', () => {
      const result = pickEpsSurprise({
        guide: 6.46,
        est: 2.18,
        gFiscal: { fiscalPeriod: 'Q1', fiscalYear: 2025 },
        eFiscal: { fiscalPeriod: 'Q1', fiscalYear: 2025 },
        gMethod: 'gaap',
        eMethod: 'adj'
      });
      
      expect(result.value).toBe(null);
      expect(result.basis).toBeUndefined();
    });

    test('should use consensus if available', () => {
      const result = pickEpsSurprise({
        guide: 6.46,
        est: 2.18,
        consensusPct: 150.0,
        gFiscal: { fiscalPeriod: 'Q1', fiscalYear: 2025 },
        eFiscal: { fiscalPeriod: 'Q1', fiscalYear: 2025 }
      });
      
      expect(result.value).toBe(150.0);
      expect(result.basis).toBe('consensus');
    });

    test('should use previous midpoint if no estimate', () => {
      const result = pickEpsSurprise({
        guide: 6.46,
        est: null,
        prevMin: 5.0,
        prevMax: 7.0,
        gFiscal: { fiscalPeriod: 'Q1', fiscalYear: 2025 },
        eFiscal: { fiscalPeriod: 'Q1', fiscalYear: 2025 }
      });
      
      expect(result.value).toBeCloseTo(7.67, 1); // (6.46 - 6.0) / 6.0 * 100
      expect(result.basis).toBe('previous_mid');
    });
  });
});
