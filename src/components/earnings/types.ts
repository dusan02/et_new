/**
 * 📊 Earnings Components Types
 * Centralized type definitions for earnings components
 */

export interface EarningsData {
  ticker: string;
  reportTime: string | null;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | bigint | null;
  revenueActual: number | bigint | null;
  sector: string | null;
  companyType: string | null;
  dataSource: string | null;
  fiscalPeriod: string | null;
  fiscalYear: number | null;
  primaryExchange: string | null;
  companyName: string;
  size: string | null;
  marketCap: number | null;
  marketCapDiff: number | null;
  marketCapDiffBillions: number | null;
  currentPrice: number | null;
  previousClose: number | null;
  priceChangePercent: number | null;
  sharesOutstanding: number | null;
  debug?: {
    ticker: string;
    currentPrice: number | null;
    previousClose: number | null;
    priceChangePercent: number | null;
    currentPriceType: string;
    previousCloseType: string;
    priceChangePercentType: string;
    marketInfoSource: string;
  };
}

export interface EarningsTableProps {
  data: EarningsData[];
  stats: any;
  isLoading: boolean;
  error: string | null;
  lastUpdated?: Date | null;
}

export interface EarningsTableHeaderProps {
  lastUpdated?: Date | null;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
}

export interface EarningsTableBodyProps {
  data: EarningsData[];
  isLoading: boolean;
  error: string | null;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

export interface EarningsTableRowProps {
  item: EarningsData;
  index: number;
}

export interface EarningsTableFooterProps {
  stats: any;
  dataLength: number;
}