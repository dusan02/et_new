export type BigN = bigint | null | undefined;

export function applyEarningsFallback<T extends {
  epsActual: BigN; epsEstimate: BigN;
  revenueActual: BigN; revenueEstimate: BigN;
}>(row: T) {
  const out: T = { ...row };

  let usedEpsFallback = false;
  let usedRevenueFallback = false;

  if (out.epsActual == null && out.epsEstimate != null) {
    out.epsActual = out.epsEstimate;
    usedEpsFallback = true;
  }
  if (out.revenueActual == null && out.revenueEstimate != null) {
    out.revenueActual = out.revenueEstimate;
    usedRevenueFallback = true;
  }

  return { out, usedEpsFallback, usedRevenueFallback };
}