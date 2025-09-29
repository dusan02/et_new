/**
 * 📊 EARNINGS COMPONENTS EXPORT
 * Centralizovaný export pre earnings komponenty
 */

export { EarningsTableRefactored } from './EarningsTableRefactored';
export { OptimizedEarningsTable } from './OptimizedEarningsTable';
export { LazyEarningsTable } from './LazyEarningsTable';
export { EarningsHeader } from './EarningsHeader';
export { EarningsRow } from './EarningsRow';
export { EarningsFilters } from './EarningsFilters';
export { EarningsStats } from './EarningsStats';

// Hooks
export { useEarningsData } from './hooks/useEarningsData';
export { useVirtualization } from './hooks/useVirtualization';
export { usePerformanceOptimization } from './hooks/usePerformanceOptimization';

export type {
  EarningsData,
  EarningsStats as EarningsStatsType,
  SortConfig,
  FilterConfig,
  TableColumn,
  EarningsRowProps,
  EarningsHeaderProps,
  EarningsFiltersProps,
  EarningsStatsProps
} from './types';

export {
  formatPercent,
  formatBillions,
  formatPrice,
  formatMarketCap,
  formatMarketCapDiff,
  getChangeColor,
  getSurpriseColor,
  getSortIcon,
  filterData,
  sortData,
  calculateEpsSurprise,
  calculateRevenueSurprise,
  getUniqueSectors,
  getUniqueSizes,
  getReportTimeLabel,
  getReportTimeColor
} from './utils';
