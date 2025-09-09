export function formatGuidePercent(value?: number | null) {
  if (value == null || !isFinite(value)) return '–';
  const clamped = Math.max(-300, Math.min(300, value));
  const sign = clamped >= 0 ? '+' : '';
  const warn = Math.abs(value) > 300 ? ' !' : '';
  return `${sign}${clamped.toFixed(2)}%${warn}`;
}

// 🚫 GUIDANCE DISABLED FOR PRODUCTION - getGuidanceTitle function commented out
// TODO: Re-enable when guidance issues are resolved
/*
export function getGuidanceTitle(basis?: string | null, rawValue?: number | null): string {
  if (!basis) return 'No data';
  
  const basisText = {
    consensus: 'Based on consensus',
    estimate: 'Based on estimate',
    previous_mid: 'Based on previous guidance midpoint'
  }[basis] || '';
  
  const raw = (rawValue != null && isFinite(rawValue)) ? rawValue.toFixed(2) : null;
  return basisText + (raw ? ` (Raw: ${raw}%)` : '');
}
*/
