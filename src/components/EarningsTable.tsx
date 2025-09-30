'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { SkeletonLoader, SkeletonCard } from './ui/SkeletonLoader';
// Define EarningsData interface locally since we removed the types file
interface EarningsData {
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
  companyName: string;
  size: string | null;
  marketCap: number | null;
  marketCapDiff: number | null;
  marketCapDiffBillions: number | null;
  currentPrice: number | null;
  previousClose: number | null;
  priceChangePercent: number | null;
  sharesOutstanding: number | null;
}

interface EarningsTableProps {
  data: EarningsData[];
  stats: any;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export default function EarningsTable({
  data,
  stats,
  isLoading,
  error,
  onRefresh
}: EarningsTableProps) {
  const [sortConfig, setSortConfig] = useState<{
    field: string | null;
    direction: 'asc' | 'desc';
  }>({ field: 'marketCap', direction: 'desc' });

  const [filterConfig, setFilterConfig] = useState({
    searchTerm: '',
    showOnlyWithActual: false,
    sizeFilter: null as string | null,
    sectorFilter: null as string | null
  });

  // Processed data with filtering and sorting
  const processedData = useMemo(() => {
    let filtered = data.filter(item => {
      // Search filter
      if (filterConfig.searchTerm) {
        const searchLower = filterConfig.searchTerm.toLowerCase();
        const matchesSearch = 
          item.ticker.toLowerCase().includes(searchLower) ||
          item.companyName.toLowerCase().includes(searchLower) ||
          (item.sector && item.sector.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }

      // Size filter
      if (filterConfig.sizeFilter && item.size !== filterConfig.sizeFilter) {
        return false;
      }

      return true;
    });

    // Sorting
    if (sortConfig.field) {
      filtered.sort((a, b) => {
        const aValue = getNestedValue(a, sortConfig.field!);
        const bValue = getNestedValue(b, sortConfig.field!);

        // Ignoruj nulové hodnoty - daj ich na koniec
        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return 1; // null hodnoty na koniec
        if (bValue === null) return -1; // null hodnoty na koniec

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' 
            ? aValue - bValue
            : bValue - aValue;
        }

        return 0;
      });
    }

    return filtered;
  }, [data, filterConfig, sortConfig]);

  const handleSort = useCallback((field: string) => {
    setSortConfig(prev => {
      // Ak je to ten istý stĺpec, striedaj smer
      if (prev.field === field) {
        return {
          field: field,
          direction: prev.direction === 'desc' ? 'asc' : 'desc'
        };
      }
      // Ak je to nový stĺpec, začni s DESC
      return {
        field: field,
        direction: 'desc'
      };
    });
  }, []);

  const handleFilterChange = useCallback((newFilterConfig: typeof filterConfig) => {
    setFilterConfig(newFilterConfig);
  }, []);

  const clearFilters = useCallback(() => {
    setFilterConfig({
      searchTerm: '',
      showOnlyWithActual: false,
      sizeFilter: null,
      sectorFilter: null
    });
  }, []);

  const hasActiveFilters = filterConfig.searchTerm || 
    filterConfig.sizeFilter;

  // Pomôcky pre typovú bezpečnosť
  const isNonEmptyString = (v: unknown): v is string =>
    typeof v === "string" && v.length > 0;

  const ORDER = new Map<string, number>([
    ["Mega", 0],
    ["Large", 1],
    ["Mid", 2],
    ["Small", 3],
  ]);
  const rank = (s: string) => ORDER.get(s) ?? Number.POSITIVE_INFINITY;

  // Get unique values for filters
  const uniqueSizes = useMemo(() => {
    const sizes = new Set(data.map(item => item.size).filter(Boolean));
    const sortedSizes = Array.from(sizes);
    // ✅ nová bezpečná verzia: odfiltrujeme null/undefined, potom stabilné triedenie
    const normalizedSizes = (sortedSizes ?? []).filter(isNonEmptyString);
    const sorted = normalizedSizes.sort((a, b) => {
      const diff = rank(a) - rank(b);
      return diff !== 0 ? diff : a.localeCompare(b);
    });
    return sorted;
  }, [data]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200">
          <div className="mb-4">
            <div className="h-6 sm:h-7 md:h-8 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          </div>
        </div>
        
        {/* Mobile Skeleton */}
        <div className="block sm:hidden p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonLoader key={i} type="card" />
          ))}
        </div>
        
        {/* Desktop Skeleton */}
        <div className="hidden sm:block">
          <SkeletonLoader type="table" />
        </div>
        
        {/* Footer Skeleton */}
        <div className="bg-gray-50 px-3 sm:px-6 py-2 sm:py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0">
          <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-40 h-4 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="text-red-600 text-lg font-semibold mb-2">
          Error loading data
        </div>
        <div className="text-gray-600 mb-4">{error}</div>
      <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
      </button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Today's Earnings</h2>
        <p className="text-gray-600">No earnings scheduled for today.</p>
      <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 mx-auto mt-4"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
      </button>
    </div>
  );
    }

    return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-colors duration-300 border border-gray-300">
      <div className="p-3 sm:p-4 md:p-6 border-b border-gray-300">
        <div className="mb-4">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            {stats?.totalCompanies || 0} companies reporting earnings today
          </h2>
          </div>
        </div>
        
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-300">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-0 sm:min-w-64">
          <input
            type="text"
              placeholder="Search ticker or company name..."
              value={filterConfig.searchTerm}
              onChange={(e) => handleFilterChange({ ...filterConfig, searchTerm: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-200 text-gray-900 dark:text-gray-900 placeholder-gray-500 dark:placeholder-gray-600"
          />
        </div>

          {/* Company Size */}
          <div className="w-full sm:w-auto sm:min-w-48">
            <select
              value={filterConfig.sizeFilter || ''}
              onChange={(e) => handleFilterChange({ ...filterConfig, sizeFilter: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-200 text-gray-900 dark:text-gray-900"
            >
              <option value="">All Sizes</option>
              {Array.from(new Set(uniqueSizes ?? []))
                .filter(isNonEmptyString)
                .map(size => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
            </select>
      </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button 
              onClick={clearFilters}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Reset
            </button>
          )}
          </div>
          
        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="mt-4">
            <span className="text-sm text-gray-600">Active filters:</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {filterConfig.searchTerm && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Search: {filterConfig.searchTerm}
                </span>
              )}
              {filterConfig.sizeFilter && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Size: {filterConfig.sizeFilter}
                </span>
              )}
              </div>
            </div>
        )}
          </div>

      {/* Mobile Cards / Desktop Table */}
      <div className="block sm:hidden">
        {/* Mobile Card View */}
        {processedData.map((item, index) => (
          <div key={item.ticker} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 mb-2 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
            {/* Header */}
      <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">#{index + 1}</span>
                {item.size && (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    item.size === 'Mega' 
                      ? 'bg-red-100 text-red-800 border border-red-200' 
                      : item.size === 'Large' 
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                      : 'text-gray-600'
                  }`}>
                    {item.size}
                  </span>
                )}
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 dark:text-gray-400">Report Time</div>
          <div className="font-medium text-sm text-gray-900 dark:text-white">
            {item.reportTime || '-'}
          </div>
        </div>
      </div>

            {/* Company Info */}
            <div className="text-center mb-2">
              <div className="font-semibold text-gray-900 dark:text-white text-base">{item.ticker}</div>
              <div className="text-xs text-gray-500 dark:text-gray-300">{item.companyName}</div>
            </div>

            {/* Main Metrics */}
      <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="text-xs text-gray-500 dark:text-gray-300">Market Cap</div>
                <div className="font-semibold text-sm text-gray-900 dark:text-black">
                  {item.marketCap ? `$${(Number(item.marketCap) / 1_000_000_000).toFixed(1)}B` : '-'}
        </div>
        </div>
              <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="text-xs text-gray-500 dark:text-gray-300">Price</div>
                <div className="font-semibold text-sm text-gray-900 dark:text-black">
            {item.currentPrice ? `$${item.currentPrice.toFixed(2)}` : '-'}
        </div>
        </div>
      </div>

            {/* Changes */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="text-xs text-gray-500 dark:text-gray-300">Cap Diff</div>
                <div className={`font-semibold text-sm ${
                  item.marketCapDiffBillions !== null 
                    ? (item.marketCapDiffBillions >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {item.marketCapDiffBillions !== null ? (
                    `${item.marketCapDiffBillions >= 0 ? '+' : ''}${item.marketCapDiffBillions.toFixed(1)}B`
                  ) : '-'}
              </div>
              </div>
              <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="text-xs text-gray-500 dark:text-gray-300">Change</div>
                <div className={`font-semibold text-sm ${
                  item.priceChangePercent !== null 
                    ? (item.priceChangePercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {item.priceChangePercent !== null ? (
                    `${item.priceChangePercent >= 0 ? '+' : ''}${item.priceChangePercent.toFixed(2)}%`
                  ) : '-'}
              </div>
            </div>
          </div>

            {/* EPS & Revenue Data - Two Column Layout */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              {/* Left Column - EPS Data */}
              <div className="space-y-1">
                <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="text-xs text-gray-500 dark:text-gray-300">EPS Est</div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-black">
                    {item.epsEstimate ? `$${item.epsEstimate.toFixed(2)}` : '-'}
          </div>
        </div>
                <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="text-xs text-gray-500 dark:text-gray-300">EPS Act</div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-black">
                    {item.epsActual ? `$${item.epsActual.toFixed(2)}` : '-'}
          </div>
        </div>
                <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="text-xs text-gray-500 dark:text-gray-300">EPS Surp</div>
                  <div className={`font-semibold text-sm ${
                    item.epsActual && item.epsEstimate ? getSurpriseColor(item.epsActual, item.epsEstimate) : 'text-gray-900 dark:text-white'
                  }`}>
                    {item.epsActual && item.epsEstimate ? getSurpriseText(item.epsActual, item.epsEstimate) : '-'}
          </div>
        </div>
      </div>

              {/* Right Column - Revenue Data */}
              <div className="space-y-1">
                <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="text-xs text-gray-500 dark:text-gray-300">Rev Est</div>
                  <div className="font-semibold text-sm whitespace-nowrap text-gray-900 dark:text-black">
                    {item.revenueEstimate ? formatRevenueValue(Number(item.revenueEstimate)) : '-'}
          </div>
        </div>
                <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="text-xs text-gray-500 dark:text-gray-300">Rev Act</div>
                  <div className="font-semibold text-sm whitespace-nowrap text-gray-900 dark:text-black">
                    {item.revenueActual ? formatRevenueValue(Number(item.revenueActual)) : '-'}
          </div>
        </div>
                <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="text-xs text-gray-500 dark:text-gray-300">Rev Surp</div>
                  <div className={`font-semibold text-sm ${
                    item.revenueActual && item.revenueEstimate ? getSurpriseColor(item.revenueActual, item.revenueEstimate) : 'text-gray-900 dark:text-white'
                  }`}>
                    {item.revenueActual && item.revenueEstimate ? getSurpriseText(item.revenueActual, item.revenueEstimate) : '-'}
          </div>
        </div>
      </div>
    </div>
          </div>
            ))}
          </div>

      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto -mx-3 sm:mx-0">
        <div className="relative">
          <table className="min-w-full divide-y divide-gray-200 table-fixed border border-gray-300">
                <thead className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-300 dark:to-gray-400 border-b-2 border-blue-200 dark:border-gray-500">
                  <tr>
                  <th className="w-4 sm:w-5 px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-blue-700 dark:text-gray-800 uppercase tracking-wider">
                #
                  </th>
                  <th 
                className={`w-32 sm:w-48 px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-400 hover:text-blue-800 dark:hover:text-gray-900 transition-all duration-200 ${
                  sortConfig.field === 'ticker' ? 'text-blue-900 dark:text-gray-900 bg-blue-100 dark:bg-gray-400' : 'text-blue-700 dark:text-gray-800'
                }`}
                onClick={() => handleSort('ticker')}
                  >
                Ticker
                  </th>
                  <th 
                className={`w-12 sm:w-16 px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-400 hover:text-blue-800 dark:hover:text-gray-900 transition-all duration-200 ${
                  sortConfig.field === 'reportTime' ? 'text-blue-900 dark:text-gray-900 bg-blue-100 dark:bg-gray-400' : 'text-blue-700 dark:text-gray-800'
                }`}
                onClick={() => handleSort('reportTime')}
                  >
                Time
                  </th>
                  <th 
                className={`w-10 sm:w-12 px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-400 hover:text-blue-800 dark:hover:text-gray-900 transition-all duration-200 ${
                  sortConfig.field === 'size' ? 'text-blue-900 dark:text-gray-900 bg-blue-100 dark:bg-gray-400' : 'text-blue-700 dark:text-gray-800'
                }`}
                onClick={() => handleSort('size')}
                  >
                Size
                  </th>
                  <th 
                className={`w-20 sm:w-24 px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-400 hover:text-blue-800 dark:hover:text-gray-900 transition-all duration-200 ${
                  sortConfig.field === 'marketCap' ? 'text-blue-900 dark:text-gray-900 bg-blue-100 dark:bg-gray-400' : 'text-blue-700 dark:text-gray-800'
                }`}
                onClick={() => handleSort('marketCap')}
                  >
                Market Cap
                  </th>
                  <th 
                className={`w-20 sm:w-24 px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-400 hover:text-blue-800 dark:hover:text-gray-900 transition-all duration-200 ${
                  sortConfig.field === 'marketCapDiff' ? 'text-blue-900 dark:text-gray-900 bg-blue-100 dark:bg-gray-400' : 'text-blue-700 dark:text-gray-800'
                }`}
                onClick={() => handleSort('marketCapDiff')}
                  >
                Cap Diff
                  </th>
                  <th 
                className={`w-20 sm:w-24 px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-400 hover:text-blue-800 dark:hover:text-gray-900 transition-all duration-200 ${
                  sortConfig.field === 'currentPrice' ? 'text-blue-900 dark:text-gray-900 bg-blue-100 dark:bg-gray-400' : 'text-blue-700 dark:text-gray-800'
                }`}
                onClick={() => handleSort('currentPrice')}
                  >
                Price
                  </th>
                  <th 
                className={`w-20 sm:w-24 px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-400 hover:text-blue-800 dark:hover:text-gray-900 transition-all duration-200 ${
                  sortConfig.field === 'priceChangePercent' ? 'text-blue-900 dark:text-gray-900 bg-blue-100 dark:bg-gray-400' : 'text-blue-700 dark:text-gray-800'
                }`}
                onClick={() => handleSort('priceChangePercent')}
                  >
                Change
                  </th>
                  <th 
                className={`w-20 sm:w-24 px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-400 hover:text-blue-800 dark:hover:text-gray-900 transition-all duration-200 ${
                  sortConfig.field === 'epsEstimate' ? 'text-blue-900 dark:text-gray-900 bg-blue-100 dark:bg-gray-400' : 'text-blue-700 dark:text-gray-800'
                }`}
                onClick={() => handleSort('epsEstimate')}
                  >
                EPS Est
                  </th>
                  <th 
                className={`w-20 sm:w-24 px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-400 hover:text-blue-800 dark:hover:text-gray-900 transition-all duration-200 ${
                  sortConfig.field === 'epsActual' ? 'text-blue-900 dark:text-gray-900 bg-blue-100 dark:bg-gray-400' : 'text-blue-700 dark:text-gray-800'
                }`}
                onClick={() => handleSort('epsActual')}
                  >
                EPS Act
              </th>
              <th className="w-20 sm:w-24 px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-blue-700 dark:text-gray-800 uppercase tracking-wider">
                EPS Surp
                  </th>
                  <th 
                className={`w-20 sm:w-24 px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-400 hover:text-blue-800 dark:hover:text-gray-900 transition-all duration-200 ${
                  sortConfig.field === 'revenueEstimate' ? 'text-blue-900 dark:text-gray-900 bg-blue-100 dark:bg-gray-400' : 'text-blue-700 dark:text-gray-800'
                }`}
                onClick={() => handleSort('revenueEstimate')}
                  >
                Rev Est
                  </th>
                  <th 
                className={`w-20 sm:w-24 px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-400 hover:text-blue-800 dark:hover:text-gray-900 transition-all duration-200 ${
                  sortConfig.field === 'revenueActual' ? 'text-blue-900 dark:text-gray-900 bg-blue-100 dark:bg-gray-400' : 'text-blue-700 dark:text-gray-800'
                }`}
                onClick={() => handleSort('revenueActual')}
                  >
                Rev Act
                  </th>
              <th className="w-20 sm:w-24 px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-blue-700 dark:text-gray-800 uppercase tracking-wider">
                Rev Surp
                  </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-200 divide-y divide-gray-200 dark:divide-gray-300">
            {processedData.map((item, index) => (
              <tr key={item.ticker} className="hover:bg-gray-50 dark:hover:bg-gray-300 transition-colors duration-200 ease-in-out animate-fade-in" style={{ animationDelay: `${index * 30}ms` }}>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center">
                      {index + 1}
                    </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-900">
                  <div className="flex flex-col">
                    <span className="font-semibold">{item.ticker}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-900">{item.companyName}</span>
                  </div>
                      </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 dark:text-gray-900">
                  {item.reportTime || '-'}
                      </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 dark:text-gray-900">
                  {item.size ? (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      item.size === 'Mega' 
                        ? 'bg-red-100 text-red-800 border border-red-200' 
                        : item.size === 'Large' 
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        : 'text-gray-600'
                    }`}>
                      {item.size}
                    </span>
                  ) : '-'}
                    </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 text-right">
                  {item.marketCap ? `$${(Number(item.marketCap) / 1_000_000_000).toFixed(1)}B` : '-'}
                    </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-right">
                  {item.marketCapDiffBillions !== null ? (
                    <span className={item.marketCapDiffBillions >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {item.marketCapDiffBillions >= 0 ? '+' : ''}${item.marketCapDiffBillions.toFixed(1)}B
                    </span>
                  ) : '-'}
                    </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 text-right">
                      {item.currentPrice ? `$${item.currentPrice.toFixed(2)}` : '-'}
                    </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-right">
                  {item.priceChangePercent !== null ? (
                    <span className={item.priceChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {item.priceChangePercent >= 0 ? '+' : ''}{item.priceChangePercent.toFixed(2)}%
                    </span>
                  ) : '-'}
                    </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 text-right">
                  {item.epsEstimate ? `$${item.epsEstimate.toFixed(2)}` : '-'}
                    </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 text-right">
                  {item.epsActual ? `$${item.epsActual.toFixed(2)}` : '-'}
                    </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-right">
                  {item.epsActual && item.epsEstimate ? (
                    <span className={getSurpriseColor(item.epsActual, item.epsEstimate)}>
                      {getSurpriseText(item.epsActual, item.epsEstimate)}
                    </span>
                  ) : '-'}
                    </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 text-right whitespace-nowrap">
                  {item.revenueEstimate ? formatRevenueValue(Number(item.revenueEstimate)) : '-'}
                    </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 text-right whitespace-nowrap">
                  {item.revenueActual ? formatRevenueValue(Number(item.revenueActual)) : '-'}
                    </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-right">
                  {item.revenueActual && item.revenueEstimate ? (
                    <span className={getSurpriseColor(item.revenueActual, item.revenueEstimate)}>
                      {getSurpriseText(item.revenueActual, item.revenueEstimate)}
                    </span>
                  ) : '-'}
                    </td>
                  </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

      {/* Footer */}
      <div className="bg-gray-50 dark:bg-gray-200 px-3 sm:px-6 py-2 sm:py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0 text-xs sm:text-sm text-gray-500 dark:text-gray-700">
        <span>Showing {processedData.length} of {data.length} companies</span>
        <span>Last updated: {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : 'Loading...'}</span>
          </div>
    </div>
  );
}

// Helper functions
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function formatRevenueValue(value: number): string {
  if (value >= 1_000_000_000) {
    // Convert to billions
    const billions = value / 1_000_000_000;
    return `$ ${billions.toLocaleString('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    })} B`;
  } else if (value >= 1_000_000) {
    // Convert to millions
    const millions = value / 1_000_000;
    return `$ ${millions.toLocaleString('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    })} M`;
  } else {
    // Keep as is for smaller values
    return `$ ${value.toLocaleString('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    })}`;
  }
}


function getSurpriseColor(actual: number, estimate: number): string {
  if (actual > estimate) return 'text-green-600 dark:text-green-400';
  if (actual < estimate) return 'text-red-600 dark:text-red-400';
  return 'text-gray-500 dark:text-gray-400';
}

function getSurpriseText(actual: number, estimate: number): string {
  if (estimate === 0) return '-';
  const surprise = ((actual - estimate) / Math.abs(estimate)) * 100;
  return `${surprise >= 0 ? '+' : ''}${surprise.toFixed(1)}%`;
}
