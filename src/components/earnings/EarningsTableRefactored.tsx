/**
 * 📊 REFACTORED EARNINGS TABLE
 * Modulárny a optimalizovaný earnings table komponent
 */

import { useState, useMemo, useCallback, memo, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { SkeletonTable } from '../ui/SkeletonCard';
import { EarningsHeader } from './EarningsHeader';
import { EarningsRow } from './EarningsRow';
import { EarningsFilters } from './EarningsFilters';
import { EarningsStats } from './EarningsStats';
import { useEarningsData } from './hooks/useEarningsData';
import { 
  SortConfig, 
  FilterConfig, 
  TableColumn 
} from './types';
import { filterData, sortData } from './utils';

const TABLE_COLUMNS: TableColumn[] = [
  { key: 'index', label: '#', sortable: false, width: '60px' },
  { key: 'ticker', label: 'Ticker', sortable: true, width: '200px' },
  { key: 'reportTime', label: 'Time', sortable: true, width: '120px' },
  { key: 'size', label: 'Size', sortable: true, width: '100px' },
  { key: 'marketCap', label: 'Market Cap', sortable: true, width: '120px' },
  { key: 'marketCapDiff', label: 'Cap Diff', sortable: true, width: '120px' },
  { key: 'currentPrice', label: 'Price', sortable: true, width: '100px' },
  { key: 'priceChangePercent', label: 'Change', sortable: true, width: '100px' },
  { key: 'epsEstimate', label: 'EPS Est', sortable: true, width: '100px' },
  { key: 'epsActual', label: 'EPS Act', sortable: true, width: '100px' },
  { key: 'epsSurprise', label: 'EPS Surp', sortable: false, width: '100px' },
  { key: 'revenueEstimate', label: 'Rev Est', sortable: true, width: '120px' },
  { key: 'revenueActual', label: 'Rev Act', sortable: true, width: '120px' },
  { key: 'revenueSurprise', label: 'Rev Surp', sortable: false, width: '100px' },
];

export const EarningsTableRefactored = memo(function EarningsTableRefactored() {
  const {
    data,
    stats,
    isLoading,
    error,
    processedData,
    sortConfig,
    filterConfig,
    setSortConfig,
    setFilterConfig,
    refresh
  } = useEarningsData();

  // Virtualization setup
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: processedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Estimated row height
    overscan: 10
  });

  // Event handlers
  const handleSort = useCallback((field: string) => {
    setSortConfig(prev => ({
      field: field as any,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, [setSortConfig]);

  const handleFilterChange = useCallback((newFilterConfig: FilterConfig) => {
    setFilterConfig(newFilterConfig);
  }, [setFilterConfig]);

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {stats.totalCompanies} companies reporting earnings today
            </h2>
            <button
              onClick={refresh}
              disabled
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 bg-gray-100 rounded-lg cursor-not-allowed"
            >
              <RefreshCw className="w-4 h-4 animate-spin" />
              Refreshing...
            </button>
          </div>
          <SkeletonTable />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="text-center">
            <div className="text-red-600 text-lg font-semibold mb-2">
              Error loading data
            </div>
            <div className="text-gray-600 mb-4">{error}</div>
            <button
              onClick={refresh}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {stats.totalCompanies} companies reporting earnings today
          </h2>
          <button
            onClick={refresh}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
        
        <EarningsStats stats={stats} isLoading={false} />
      </div>

      {/* Filters */}
      <EarningsFilters
        filterConfig={filterConfig}
        onFilterChange={handleFilterChange}
        stats={stats}
        data={data}
      />

      {/* Table */}
      <div className="overflow-hidden">
        <div
          ref={parentRef}
          className="h-96 overflow-auto"
        >
          <table className="min-w-full divide-y divide-gray-200">
            <EarningsHeader
              columns={TABLE_COLUMNS}
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <tbody className="bg-white divide-y divide-gray-200">
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const item = processedData[virtualItem.index];
                return (
                  <EarningsRow
                    key={item.ticker}
                    data={item}
                    index={virtualItem.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Showing {processedData.length} of {data.length} companies
            {filterConfig.searchTerm && (
              <span className="ml-2 text-blue-600">
                (filtered by "{filterConfig.searchTerm}")
              </span>
            )}
          </div>
          <div>
            Last updated: {new Date(stats.lastUpdated).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
});
