/**
 * Sanitizes earnings data to prevent duplicates between actual and estimate values
 * If actual equals estimate, sets actual to null (since actual values aren't available yet)
 */

export const sanitizeActual = <T extends number | null | undefined>(
  actual: T, 
  estimate: T
): T extends number ? number | null : null => {
  if (actual == null) return null as any;
  if (estimate == null) return actual;       // nothing to compare against
  return actual === estimate ? null : actual; // ⚠️ protection: no duplicates
};

/**
 * Sanitizes both EPS and Revenue actual values
 */
export const sanitizeEarningsData = (data: {
  epsActual?: number | null;
  epsEstimate?: number | null;
  revenueActual?: number | null;
  revenueEstimate?: number | null;
}) => {
  const epsActualSafe = sanitizeActual(data.epsActual, data.epsEstimate);
  const revenueActualSafe = sanitizeActual(data.revenueActual, data.revenueEstimate);
  
  return {
    epsActual: epsActualSafe,
    epsEstimate: data.epsEstimate,
    revenueActual: revenueActualSafe,
    revenueEstimate: data.revenueEstimate,
  };
};
