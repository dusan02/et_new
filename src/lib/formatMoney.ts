export type NumericLike = number | bigint | string | null | undefined;

const toNum = (v: NumericLike): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'bigint') return Number(v);           // 1.5e15 je stále bezpečné
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Heuristika: ak je hodnota >= 1e13, je to veľmi pravdepodobne microunits (×1e6).
 * (Jednotlivé kvartálne tržby firmy > $10T nedávajú zmysel.)
 */
const normalizeUSD = (n: number): number => (n >= 1e13 ? n / 1_000_000 : n);

export function formatRevenueSmart(value: NumericLike): string {
  const raw = toNum(value);
  if (raw === null) return '—';

  const usd = normalizeUSD(raw);
  const abs = Math.abs(usd);

  if (abs >= 1_000_000_000_000) {        // ≥ 1e12 → Trillions
    return `$${(usd / 1_000_000_000_000).toFixed(2)} T`;
  } else if (abs >= 1_000_000_000) {     // ≥ 1e9 → Billions
    return `$${(usd / 1_000_000_000).toFixed(2)} B`;
  } else if (abs >= 1_000_000) {         // ≥ 1e6 → Millions
    return `$${(usd / 1_000_000).toFixed(2)} M`;
  } else if (abs >= 1_000) {             // ≥ 1e3 → Thousands
    return `$${(usd / 1_000).toFixed(2)} K`;
  }
  return `$${usd.toFixed(2)}`;
}
