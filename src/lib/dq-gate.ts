import { logger } from './logger';

export interface CoverageThresholds {
  schedule: number;
  price: number;
  epsRev: number;
}

export interface CoverageData {
  schedule: number;
  price: number;
  epsRev: number;
}


/**
 * Check if coverage meets thresholds for publishing
 */
export function shouldPublish(
  coverage: CoverageData, 
  thresholds: CoverageThresholds = getCoverageThresholds()
): boolean {
  const { schedule, price, epsRev } = coverage;
  const { schedule: schedThreshold, price: priceThreshold, epsRev: epsRevThreshold } = thresholds;

  const passes = schedule >= schedThreshold && 
                 price >= priceThreshold && 
                 epsRev >= epsRevThreshold;

  logger.info('DQ Gate check', {
    coverage,
    thresholds,
    passes,
    details: {
      schedule: `${schedule}% >= ${schedThreshold}%`,
      price: `${price}% >= ${priceThreshold}%`,
      epsRev: `${epsRev}% >= ${epsRevThreshold}%`
    }
  });

  return passes;
}

/**
 * Compute coverage percentages from daily data
 * Sprint 3: Price and EPS/REV coverage implemented with exclusion logic
 */
export function computeCoverage(day: string, data: any, excludeFromCoverage: Set<string> = new Set()): CoverageData {
  logger.debug(`Computing coverage for ${day}`, { 
    dataKeys: Object.keys(data),
    excludeCount: excludeFromCoverage.size
  });

  const allTickers = data.data || [];
  
  // Filter out excluded tickers from coverage calculation
  const validTickers = allTickers.filter((t: any) => !excludeFromCoverage.has(t.ticker));
  const totalTickers = validTickers.length;
  
  const withPrice = validTickers.filter((t: any) => 
    t.last_price !== null && t.last_price !== undefined
  ).length;
  
  const withEpsRev = validTickers.filter((t: any) => 
    (t.eps_est !== null || t.eps_act !== null) && 
    (t.rev_est !== null || t.rev_act !== null)
  ).length;

  const coverage: CoverageData = {
    schedule: 0, // Will be implemented in future sprint
    price: totalTickers > 0 ? Math.round((withPrice / totalTickers) * 100) : 0,
    epsRev: totalTickers > 0 ? Math.round((withEpsRev / totalTickers) * 100) : 0
  };

  logger.info(`Coverage computed for ${day}`, {
    ...coverage,
    totalTickers: allTickers.length,
    validTickers,
    excludedTickers: excludeFromCoverage.size
  });
  
  return coverage;
}

/**
 * Get coverage thresholds from environment or use defaults
 */
export function getCoverageThresholds(): CoverageThresholds {
  return {
    schedule: parseInt(process.env.DQ_SCHEDULE_THRESHOLD || '0'), // 0 until schedule implemented
    price: parseInt(process.env.DQ_PRICE_THRESHOLD || '98'), // Production threshold
    epsRev: parseInt(process.env.DQ_EPSREV_THRESHOLD || '10') // Temporarily lowered to 10% for testing
  };
}
