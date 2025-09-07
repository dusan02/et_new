/**
 * 🎯 HYBRID GUIDANCE LOGIC
 * 
 * Kombinuje pôvodnú logiku z PHP aplikácie s mojou smart period detection:
 * - Pôvodná logika: fallback hierarchy, method validation, extreme detection
 * - Moja logika: smart period detection, confidence scoring, automatic adjustment
 */

export interface GuidanceData {
  epsGuidance: number | null;
  revenueGuidance: bigint | null;
  guidancePeriod: 'quarterly' | 'yearly' | 'unknown';
  guidanceConfidence: number; // 0-100%
  guidanceSource: 'benzinga' | 'finnhub' | 'polygon';
  guidanceMethod: 'gaap' | 'non-gaap' | null;
  previousMinEpsGuidance?: number | null;
  previousMaxEpsGuidance?: number | null;
  previousMinRevenueGuidance?: bigint | null;
  previousMaxRevenueGuidance?: bigint | null;
}

export interface GuidanceResult {
  epsGuideSurprise: number | null;
  epsGuideBasis: 'vendor_consensus' | 'estimate' | 'previous_mid' | null;
  epsGuideExtreme: boolean;
  revenueGuideSurprise: number | null;
  revenueGuideBasis: 'vendor_consensus' | 'estimate' | 'previous_mid' | null;
  revenueGuideExtreme: boolean;
  warnings: string[];
}

/**
 * Smart Period Detection - MOJA LOGIKA
 * Detekuje kvartálne vs. ročné údaje z Benzinga
 */
export function detectGuidancePeriod(
  actual: number | bigint,
  guidance: number | bigint,
  historicalData?: number[]
): {
  adjustedGuidance: number | bigint;
  period: 'quarterly' | 'yearly' | 'unknown';
  confidence: number;
} {
  const actualNum = typeof actual === 'bigint' ? Number(actual) : actual;
  const guidanceNum = typeof guidance === 'bigint' ? Number(guidance) : guidance;
  
  if (!actualNum || !guidanceNum || guidanceNum === 0) {
    return {
      adjustedGuidance: guidance,
      period: 'unknown',
      confidence: 0
    };
  }
  
  const ratio = actualNum / guidanceNum;
  
  // Detect if guidance is quarterly vs yearly
  if (ratio >= 3.5 && ratio <= 4.5) {
    // Likely quarterly guidance vs yearly actual
    const adjustedGuidance = typeof guidance === 'bigint' 
      ? guidance * BigInt(4) 
      : guidance * 4;
    
    return {
      adjustedGuidance,
      period: 'quarterly',
      confidence: 85
    };
  } else if (ratio >= 0.2 && ratio <= 0.3) {
    // Likely yearly guidance vs quarterly actual
    const adjustedGuidance = typeof guidance === 'bigint' 
      ? guidance / BigInt(4) 
      : guidance / 4;
    
    return {
      adjustedGuidance,
      period: 'yearly',
      confidence: 85
    };
  } else if (ratio >= 0.8 && ratio <= 1.2) {
    // Likely same period
    return {
      adjustedGuidance: guidance,
      period: 'unknown',
      confidence: 90
    };
  }
  
  return {
    adjustedGuidance: guidance,
    period: 'unknown',
    confidence: 50
  };
}

/**
 * Period Normalization - PÔVODNÁ LOGIKA
 * Normalizuje rôzne formáty period na štandardné Q1-Q4, H1/H2, FY
 */
export function normalizePeriod(period: string | null): string | null {
  if (!period) return null;
  
  const normalized = period.toUpperCase().trim();
  switch (normalized) {
    case '1H': case 'H1': return 'H1';
    case '2H': case 'H2': return 'H2';
    case '3Q': case 'Q3': return 'Q3';
    case '4Q': case 'Q4': return 'Q4';
    case 'Q1': case 'Q2': return normalized;
    case 'FY': case 'FULL YEAR': return 'FY';
    default: return normalized;
  }
}

/**
 * Period Matching - PÔVODNÁ LOGIKA
 * Porovnáva guidance period s estimate period
 */
export function periodsMatch(
  guidancePeriod: string | null,
  guidanceYear: number | null,
  estimatePeriod: string | null,
  estimateYear: number | null
): boolean {
  if (!guidancePeriod || !guidanceYear || !estimatePeriod || !estimateYear) {
    return false;
  }
  
  const normalizedGuidancePeriod = normalizePeriod(guidancePeriod);
  const normalizedEstimatePeriod = normalizePeriod(estimatePeriod);
  
  return normalizedGuidancePeriod === normalizedEstimatePeriod && 
         guidanceYear === estimateYear;
}

/**
 * Method Validation - PÔVODNÁ LOGIKA
 * Kontroluje GAAP vs Non-GAAP kompatibilitu
 */
export function methodOk(
  guidanceMethod: string | null,
  estimateMethod: string | null
): boolean {
  // Allow calculation if either method is null (unknown)
  // Only block if both are known and different
  if (!guidanceMethod || !estimateMethod) return true;
  return guidanceMethod === estimateMethod;
}

/**
 * Can Compare - PÔVODNÁ LOGIKA
 * Kontroluje, či je možné porovnať guidance s estimate
 */
export function canCompare(
  guidance: { period: string | null; year: number | null; method: string | null },
  estimate: { period: string | null; year: number | null; method: string | null },
  guidanceValue: number | bigint | null,
  estimateValue: number | bigint | null
): boolean {
  if (!guidanceValue || !estimateValue) return false;
  
  const estimateNum = typeof estimateValue === 'bigint' ? Number(estimateValue) : estimateValue;
  if (estimateNum === 0) return false;
  
  if (!periodsMatch(guidance.period, guidance.year, estimate.period, estimate.year)) {
    return false;
  }
  
  if (!methodOk(guidance.method, estimate.method)) {
    return false;
  }
  
  return true;
}

/**
 * Extreme Value Detection - PÔVODNÁ LOGIKA
 * Flaguje hodnoty nad 300% ako potenciálne extrémne
 */
export function isExtremeValue(value: number): boolean {
  return Math.abs(value) > 300;
}

/**
 * HYBRID GUIDANCE CALCULATION
 * Kombinuje pôvodnú logiku s mojou smart period detection
 */
export function calculateGuidanceSurprise(
  actual: number | bigint | null,
  estimate: number | bigint | null,
  guidance: GuidanceData,
  vendorConsensus?: {
    epsSurprise?: number | null;
    revenueSurprise?: number | null;
  }
): GuidanceResult {
  const warnings: string[] = [];
  
  // Apply smart period detection to guidance
  const epsDetection = actual && guidance.epsGuidance 
    ? detectGuidancePeriod(actual, guidance.epsGuidance)
    : { adjustedGuidance: guidance.epsGuidance, period: 'unknown', confidence: 0 };
  
  const revenueDetection = actual && guidance.revenueGuidance
    ? detectGuidancePeriod(actual, guidance.revenueGuidance)
    : { adjustedGuidance: guidance.revenueGuidance, period: 'unknown', confidence: 0 };
  
  // Add warnings for low confidence
  if (epsDetection.confidence < 70) {
    warnings.push(`Low confidence in EPS guidance period detection (${epsDetection.confidence}%)`);
  }
  if (revenueDetection.confidence < 70) {
    warnings.push(`Low confidence in Revenue guidance period detection (${revenueDetection.confidence}%)`);
  }
  
  // EPS Guidance Surprise Fallback Hierarchy - PÔVODNÁ LOGIKA
  let epsGuideSurprise: number | null = null;
  let epsGuideBasis: 'vendor_consensus' | 'estimate' | 'previous_mid' | null = null;
  let epsGuideExtreme = false;
  
  if (vendorConsensus?.epsSurprise !== null && vendorConsensus?.epsSurprise !== undefined) {
    // 1. PRIORITA: Use vendor consensus if available
    epsGuideSurprise = vendorConsensus.epsSurprise;
    epsGuideBasis = 'vendor_consensus';
    epsGuideExtreme = isExtremeValue(epsGuideSurprise);
  } else if (canCompare(
    { period: guidance.guidancePeriod, year: null, method: guidance.guidanceMethod },
    { period: 'unknown', year: null, method: null },
    epsDetection.adjustedGuidance,
    estimate
  ) && epsDetection.adjustedGuidance !== null && estimate !== null) {
    // 2. FALLBACK: Guidance vs estimate (with smart period adjustment)
    const actualNum = typeof actual === 'bigint' ? Number(actual) : actual;
    const guidanceNum = typeof epsDetection.adjustedGuidance === 'bigint' 
      ? Number(epsDetection.adjustedGuidance) 
      : epsDetection.adjustedGuidance;
    const estimateNum = typeof estimate === 'bigint' ? Number(estimate) : estimate;
    
    if (estimateNum !== 0) {
      epsGuideSurprise = ((guidanceNum - estimateNum) / estimateNum) * 100;
      epsGuideBasis = 'estimate';
      epsGuideExtreme = isExtremeValue(epsGuideSurprise);
      
      // Add warning if guidance was adjusted
      if (epsDetection.period !== 'unknown') {
        warnings.push(`EPS guidance adjusted from ${epsDetection.period} to match actual period`);
      }
    }
  } else if (
    epsDetection.adjustedGuidance !== null &&
    guidance.previousMinEpsGuidance !== null &&
    guidance.previousMaxEpsGuidance !== null &&
    guidance.previousMinEpsGuidance !== 0 &&
    guidance.previousMaxEpsGuidance !== 0
  ) {
    // 3. FALLBACK: guidance vs previous guidance midpoint
    const guidanceNum = typeof epsDetection.adjustedGuidance === 'bigint' 
      ? Number(epsDetection.adjustedGuidance) 
      : epsDetection.adjustedGuidance;
    const midpoint = (guidance.previousMinEpsGuidance + guidance.previousMaxEpsGuidance) / 2;
    
    if (midpoint !== 0) {
      epsGuideSurprise = ((guidanceNum - midpoint) / midpoint) * 100;
      epsGuideBasis = 'previous_mid';
      epsGuideExtreme = isExtremeValue(epsGuideSurprise);
    }
  }
  
  // Revenue Guidance Surprise Fallback Hierarchy - PÔVODNÁ LOGIKA
  let revenueGuideSurprise: number | null = null;
  let revenueGuideBasis: 'vendor_consensus' | 'estimate' | 'previous_mid' | null = null;
  let revenueGuideExtreme = false;
  
  if (vendorConsensus?.revenueSurprise !== null && vendorConsensus?.revenueSurprise !== undefined) {
    // 1. PRIORITA: Use vendor consensus if available
    revenueGuideSurprise = vendorConsensus.revenueSurprise;
    revenueGuideBasis = 'vendor_consensus';
    revenueGuideExtreme = isExtremeValue(revenueGuideSurprise);
  } else if (canCompare(
    { period: guidance.guidancePeriod, year: null, method: guidance.guidanceMethod },
    { period: 'unknown', year: null, method: null },
    revenueDetection.adjustedGuidance,
    estimate
  ) && revenueDetection.adjustedGuidance !== null && estimate !== null) {
    // 2. FALLBACK: Guidance vs estimate (with smart period adjustment)
    const actualNum = typeof actual === 'bigint' ? Number(actual) : actual;
    const guidanceNum = typeof revenueDetection.adjustedGuidance === 'bigint' 
      ? Number(revenueDetection.adjustedGuidance) 
      : revenueDetection.adjustedGuidance;
    const estimateNum = typeof estimate === 'bigint' ? Number(estimate) : estimate;
    
    if (estimateNum !== 0) {
      revenueGuideSurprise = ((guidanceNum - estimateNum) / estimateNum) * 100;
      revenueGuideBasis = 'estimate';
      revenueGuideExtreme = isExtremeValue(revenueGuideSurprise);
      
      // Add warning if guidance was adjusted
      if (revenueDetection.period !== 'unknown') {
        warnings.push(`Revenue guidance adjusted from ${revenueDetection.period} to match actual period`);
      }
    }
  } else if (
    revenueDetection.adjustedGuidance !== null &&
    guidance.previousMinRevenueGuidance !== null &&
    guidance.previousMaxRevenueGuidance !== null &&
    guidance.previousMinRevenueGuidance !== BigInt(0) &&
    guidance.previousMaxRevenueGuidance !== BigInt(0)
  ) {
    // 3. FALLBACK: guidance vs previous guidance midpoint
    const guidanceNum = typeof revenueDetection.adjustedGuidance === 'bigint' 
      ? Number(revenueDetection.adjustedGuidance) 
      : revenueDetection.adjustedGuidance;
    const midpoint = (Number(guidance.previousMinRevenueGuidance) + Number(guidance.previousMaxRevenueGuidance)) / 2;
    
    if (midpoint !== 0) {
      revenueGuideSurprise = ((guidanceNum - midpoint) / midpoint) * 100;
      revenueGuideBasis = 'previous_mid';
      revenueGuideExtreme = isExtremeValue(revenueGuideSurprise);
    }
  }
  
  return {
    epsGuideSurprise,
    epsGuideBasis,
    epsGuideExtreme,
    revenueGuideSurprise,
    revenueGuideBasis,
    revenueGuideExtreme,
    warnings
  };
}

/**
 * Format Guidance Surprise for Display
 */
export function formatGuidanceSurprise(
  surprise: number | null,
  basis: string | null,
  extreme: boolean,
  warnings: string[]
): {
  display: string;
  className: string;
  tooltip: string;
} {
  if (surprise === null) {
    return {
      display: '-',
      className: 'text-gray-500',
      tooltip: 'No guidance data available'
    };
  }
  
  const display = `${surprise >= 0 ? '+' : ''}${surprise.toFixed(1)}%`;
  let className = 'text-gray-900';
  let tooltip = `Basis: ${basis || 'unknown'}`;
  
  if (extreme) {
    className = 'text-red-600 font-bold';
    tooltip += ' (EXTREME VALUE >300%)';
  } else if (surprise > 0) {
    className = 'text-green-600';
  } else if (surprise < 0) {
    className = 'text-red-600';
  }
  
  if (warnings.length > 0) {
    tooltip += `\nWarnings: ${warnings.join(', ')}`;
  }
  
  return { display, className, tooltip };
}
