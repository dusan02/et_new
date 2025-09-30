/**
 * 📊 EARNINGS COMPONENT TYPES
 * Centralizované typy pre earnings komponenty
 */

export interface EarningsData {
  ticker: string;
  reportTime: string | null;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
  sector: string | null;
  companyType: string | null;
  dataSource: string | null;
  fiscalPeriod: string | null;
  fiscalYear: number | null;
  primaryExchange: string | null;
  // Market data
  companyName: string;
  size: string | null;
  marketCap: number | null;
  marketCapDiff: number | null;
  marketCapDiffBillions: number | null;
  currentPrice: number | null;
  previousClose: number | null;
  priceChangePercent: number | null;
  sharesOutstanding: number | null;
  // Guidance calculations
  epsGuideSurprise: number | null;
  epsGuideBasis: string | null;
  epsGuideExtreme: boolean;
  revenueGuideSurprise: number | null;
  revenueGuideBasis: string | null;
  revenueGuideExtreme: boolean;
  // Raw guidance data
  guidanceData: {
    estimatedEpsGuidance: number | null;
    estimatedRevenueGuidance: string | null;
    epsGuideVsConsensusPct: number | null;
    revenueGuideVsConsensusPct: number | null;
    notes: string | null;
    lastUpdated: string | null;
    fiscalPeriod: string | null;
  } | null;
}

export interface EarningsStats {
  totalCompanies: number;
  withEpsActual: number;
  withRevenueActual: number;
  withBothActual: number;
  withoutAnyActual: number;
  lastUpdated: string;
}

export type SortField = 
  | 'index'
  | 'ticker' 
  | 'companyName' 
  | 'reportTime'
  | 'size' 
  | 'marketCap' 
  | 'marketCapDiff' 
  | 'currentPrice' 
  | 'priceChangePercent' 
  | 'epsEstimate' 
  | 'epsActual' 
  | 'epsSurprise'
  | 'revenueEstimate' 
  | 'revenueActual'
  | 'revenueSurprise';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField | null;
  direction: SortDirection;
}

export interface FilterConfig {
  searchTerm: string;
  showOnlyWithActual: boolean;
  sizeFilter: string | null;
  sectorFilter: string | null;
}

export interface TableColumn {
  key: SortField;
  label: string;
  sortable: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

// Removed EarningsTableProps as it's no longer needed with useEarningsData hook

export interface EarningsRowProps {
  data: EarningsData;
  index: number;
  style?: React.CSSProperties;
}

export interface EarningsHeaderProps {
  columns: TableColumn[];
  sortConfig: SortConfig;
  onSort: (field: SortField) => void;
}

export interface EarningsFiltersProps {
  filterConfig: FilterConfig;
  onFilterChange: (config: FilterConfig) => void;
  stats: EarningsStats;
}

export interface EarningsStatsProps {
  stats: EarningsStats;
  isLoading: boolean;
}
