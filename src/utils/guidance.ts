export type FiscalPeriod = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'H1' | 'H2' | 'FY';
export type Fiscal = { fiscalPeriod?: FiscalPeriod | string | null; fiscalYear?: number | null };

export function normalizePeriod(p?: string | null): FiscalPeriod | null {
  if (!p) return null;
  const s = p.trim().toUpperCase();
  if (s === '1H' || s === 'H1') return 'H1';
  if (s === '2H' || s === 'H2') return 'H2';
  if (s === '3Q') return 'Q3';
  if (s === '4Q') return 'Q4';
  if (['Q1','Q2','Q3','Q4','FY','H1','H2'].includes(s)) return s as FiscalPeriod;
  return null; // Invalid period
}

export function periodsMatch(g: Fiscal, e: Fiscal) {
  const gp = normalizePeriod(g.fiscalPeriod);
  const ep = normalizePeriod(e.fiscalPeriod);
  if (!gp || !ep) return false;
  if (g.fiscalYear == null || e.fiscalYear == null) return false;
  return gp === ep && Number(g.fiscalYear) === Number(e.fiscalYear);
}

export function pctDiff(a: number, b: number, eps = 1e-6) {
  if (!isFinite(a) || !isFinite(b) || Math.abs(b) < eps) return null;
  return ((a - b) / Math.abs(b)) * 100;
}

export function isExtreme(v: number | null, thr = 300) {
  return v != null && Math.abs(v) > thr;
}

export function clampPercent(v: number, thr = 300) {
  return Math.max(-thr, Math.min(thr, v));
}

export function midpoint(a?: number | null, b?: number | null) {
  if (a == null || b == null) return null;
  return (a + b) / 2;
}

/**
 * Normalize revenue value to USD (remove K/M/B suffixes and convert to base units)
 * @param value - Revenue value (could be string with K/M/B suffix or number)
 * @returns Normalized value in USD base units
 */
export function normalizeRevenueToUSD(value: string | number | bigint | null): number | null {
  if (value == null) return null;
  
  let numValue: number;
  
  if (typeof value === 'bigint') {
    numValue = Number(value);
  } else if (typeof value === 'string') {
    const str = value.trim().toUpperCase();
    const match = str.match(/^([\d.]+)([KMB]?)$/);
    if (!match) return null;
    
    const baseNum = parseFloat(match[1]);
    const suffix = match[2];
    
    switch (suffix) {
      case 'K': numValue = baseNum * 1_000; break;
      case 'M': numValue = baseNum * 1_000_000; break;
      case 'B': numValue = baseNum * 1_000_000_000; break;
      default: numValue = baseNum; break;
    }
  } else {
    numValue = value;
  }
  
  // Safety check for overflow
  if (!isFinite(numValue) || numValue > Number.MAX_SAFE_INTEGER) {
    console.warn(`Revenue value too large for safe conversion: ${value}`);
    return null;
  }
  
  return numValue;
}

export type Basis = 'consensus' | 'estimate' | 'previous_mid';
export type AccountingMethod = 'gaap' | 'non-gaap' | 'adj' | 'adjusted' | 'reported' | 'operating';

/**
 * Check if accounting methods are compatible for comparison
 * @param method1 - First method (from guidance)
 * @param method2 - Second method (from estimate)
 * @returns true if methods are compatible, false otherwise
 */
export function areMethodsCompatible(method1?: string | null, method2?: string | null): boolean {
  if (!method1 || !method2) return true; // If unknown, assume compatible
  
  const m1 = method1.toLowerCase().trim();
  const m2 = method2.toLowerCase().trim();
  
  // Exact match
  if (m1 === m2) return true;
  
  // GAAP variants
  const gaapVariants = ['gaap', 'reported', 'reported_gaap'];
  const nonGaapVariants = ['non-gaap', 'non_gaap', 'adj', 'adjusted', 'operating', 'pro_forma'];
  
  const isGaap1 = gaapVariants.includes(m1);
  const isGaap2 = gaapVariants.includes(m2);
  const isNonGaap1 = nonGaapVariants.includes(m1);
  const isNonGaap2 = nonGaapVariants.includes(m2);
  
  // Both GAAP or both Non-GAAP
  if ((isGaap1 && isGaap2) || (isNonGaap1 && isNonGaap2)) return true;
  
  // Mixed methods - not compatible
  return false;
}

export function pickEpsSurprise(params: {
  // inputs
  guide?: number | null;
  est?: number | null;
  consensusPct?: number | null;
  prevMin?: number | null;
  prevMax?: number | null;
  gFiscal: Fiscal;
  eFiscal: Fiscal;
  gMethod?: string | null; // Guidance method (GAAP/Non-GAAP)
  eMethod?: string | null; // Estimate method (GAAP/Non-GAAP)
}) {
  const { guide, est, consensusPct, prevMin, prevMax, gFiscal, eFiscal, gMethod, eMethod } = params;

  // 1) vendor consensus percent (ak existuje)
  if (consensusPct != null && isFinite(consensusPct)) {
    const extreme = isExtreme(consensusPct);
    return { value: consensusPct, basis: 'consensus' as Basis, extreme };
  }

  // 2) guidance vs estimate (iba ak sa zhoduje obdobie a metóda)
  if (guide != null && est != null && periodsMatch(gFiscal, eFiscal) && areMethodsCompatible(gMethod, eMethod)) {
    const v = pctDiff(guide, est);
    if (v != null) return { value: v, basis: 'estimate' as Basis, extreme: isExtreme(v) };
  }

  // 3) guidance vs previous midpoint (metóda sa zhoduje, lebo je z tej istej guidance entity)
  const mid = midpoint(prevMin ?? null, prevMax ?? null);
  if (guide != null && mid != null) {
    const v = pctDiff(guide, mid);
    if (v != null) return { value: v, basis: 'previous_mid' as Basis, extreme: isExtreme(v) };
  }

  return { value: null, basis: null, extreme: false };
}

export const pickRevSurprise = pickEpsSurprise; // rovnaká logika, iné vstupy
