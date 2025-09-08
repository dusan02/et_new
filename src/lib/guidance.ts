/**
 * Utility functions for guidance calculations
 */

export function clampPct(v: number, maxAbs = 300) {
  return Math.max(-maxAbs, Math.min(maxAbs, v))
}

export function percentDiff(a: number, b: number) {
  if (!isFinite(a) || !isFinite(b) || b === 0) return null
  return ((a - b) / Math.abs(b)) * 100
}

type Basis = 'consensus' | 'estimate' | 'previous_mid'

export function computeGuideSurprise(opts: {
  guide?: number | null
  consensusPct?: number | null
  estimate?: number | null
  prevMin?: number | null
  prevMax?: number | null
}): { value: number | null; basis?: Basis; extreme?: boolean } {
  const { guide, consensusPct, estimate, prevMin, prevMax } = opts
  
  if (consensusPct != null) {
    const v = consensusPct
    return { value: v, basis: 'consensus', extreme: Math.abs(v) > 300 }
  }
  
  if (guide != null && estimate != null && estimate !== 0) {
    const v = percentDiff(guide, estimate)
    return v == null ? { value: null } : { value: v, basis: 'estimate', extreme: Math.abs(v) > 300 }
  }
  
  if (guide != null && prevMin != null && prevMax != null) {
    const mid = (prevMin + prevMax) / 2
    const v = percentDiff(guide, mid)
    return v == null ? { value: null } : { value: v, basis: 'previous_mid', extreme: Math.abs(v) > 300 }
  }
  
  return { value: null }
}

export function formatGuidanceValue(value: number | null, extreme: boolean = false): string {
  if (value === null) return '-'
  
  const sign = value >= 0 ? '+' : ''
  const absValue = Math.abs(value)
  
  if (extreme) {
    return `${sign}${absValue.toFixed(2)}%!`
  }
  
  return `${sign}${absValue.toFixed(2)}%`
}

export function getGuidanceTitle(basis?: Basis, rawValue?: number | null): string {
  if (!basis || rawValue === null) return ''
  
  const basisText = {
    consensus: 'Based on consensus',
    estimate: 'Based on estimate',
    previous_mid: 'Based on previous guidance midpoint'
  }[basis]
  
  return `${basisText} (Raw: ${rawValue?.toFixed(2)}%)`
}
