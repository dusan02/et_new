export type Size = 'MEGA' | 'LARGE' | 'MID' | 'SMALL';

export function classifyByMarketCap(marketCap?: number | null): Size {
  if (!marketCap || marketCap <= 0) return 'SMALL';
  // veľkosti si prípadne uprav podľa tvojich pra hov
  if (marketCap >= 200_000_000_000) return 'MEGA';   // ≥ $200B
  if (marketCap >= 10_000_000_000)  return 'LARGE';  // ≥ $10B
  if (marketCap >= 2_000_000_000)   return 'MID';    // ≥ $2B
  return 'SMALL';
}
