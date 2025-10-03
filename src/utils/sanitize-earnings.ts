/**
 * Sanitizes earnings data to prevent duplicates between actual and estimate values
 * If actual equals estimate, sets actual to null (since actual values aren't available yet)
 * Handles float comparison tolerance and unit-mismatch for revenue data
 */

export type EarningsLike = {
  ticker: string;
  epsActual?: number | null;
  epsEstimate?: number | null;
  revenueActual?: number | null;    // in "full units" (e.g. USD)
  revenueEstimate?: number | null;  // in "full units" (e.g. USD)
};

const EPSILON_ABS = 1e-6;   // absolute tolerance for EPS
const REL_TOL = 1e-4;       // relative tolerance for EPS and revenue

const nearlyEqual = (a: number, b: number, absTol = EPSILON_ABS, relTol = REL_TOL) => {
  const diff = Math.abs(a - b);
  if (diff <= absTol) return true;
  const largest = Math.max(Math.abs(a), Math.abs(b));
  return diff <= largest * relTol;
};

// For revenue, API sometimes mixes units (thousands/millions vs "full"):
// check equality at these scales:
const SCALES = [1, 1e3, 1e6, 1e9] as const;

const equalWithUnitGuess = (a: number, b: number): boolean => {
  // Try all combinations of small multiples (scale both a and b)
  for (const sa of SCALES) {
    for (const sb of SCALES) {
      const aa = a * sa;
      const bb = b * sb;
      if (nearlyEqual(aa, bb, 1e-2, 1e-4)) {
        return true;
      }
    }
  }
  return false;
};

export function sanitizeEarningsData<T extends EarningsLike>(row: T): T {
  let { epsActual, epsEstimate, revenueActual, revenueEstimate } = row;

  console.log(`[SANITIZE] Input: ${row.ticker} epsA=${epsActual} epsE=${epsEstimate} revA=${revenueActual} revE=${revenueEstimate}`);

  // 1) EPS: ACT == EST → ACT = null
  if (epsActual != null && epsEstimate != null) {
    if (nearlyEqual(epsActual, epsEstimate)) {
      epsActual = null;
      console.log(`[SANITIZE][${row.ticker}] EPS actual≈estimate → actual=null`);
    }
  }

  // 2) Revenue: ACT == EST (including unit-guess) → ACT = null
  if (revenueActual != null && revenueEstimate != null) {
    const eq = nearlyEqual(revenueActual, revenueEstimate, 1e-2, 1e-4)
            || equalWithUnitGuess(revenueActual, revenueEstimate);
    if (eq) {
      revenueActual = null;
      console.log(`[SANITIZE][${row.ticker}] REV actual≈estimate (units?) → actual=null`);
    }
  }

  console.log(`[SANITIZE] Output: ${row.ticker} epsA=${epsActual} epsE=${epsEstimate} revA=${revenueActual} revE=${revenueEstimate}`);

  // Return sanitized
  return {
    ...row,
    epsActual,
    epsEstimate,
    revenueActual,
    revenueEstimate,
  };
}
