export type BigN = bigint | null | undefined;

export function applyEarningsFallback<T extends {
  epsActual: BigN; epsEstimate: BigN;
  revenueActual: BigN; revenueEstimate: BigN;
}>(row: T) {
  const out: T = { ...row };

  let usedEpsFallback = false;
  let usedRevenueFallback = false;

  // 🚫 DISABLED: Don't create duplicates - if actual values are not available, keep them as null
  // This was causing EPS Act = EPS Est and Rev Act = Rev Est when actual values weren't released yet
  /*
  if (out.epsActual == null && out.epsEstimate != null) {
    out.epsActual = out.epsEstimate;
    usedEpsFallback = true;
  }
  if (out.revenueActual == null && out.revenueEstimate != null) {
    out.revenueActual = out.revenueEstimate;
    usedRevenueFallback = true;
  }
  */

  return { out, usedEpsFallback, usedRevenueFallback };
}