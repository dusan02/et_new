/**
 * 🚀 OPTIMIZED EARNINGS TABLE
 * Plne optimalizovaný earnings table komponent
 */

import { memo, useCallback, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useEarningsData } from './hooks/useEarningsData';
import { useVirtualization } from './hooks/useVirtualization';
import { usePerformanceOptimization } from './hooks/usePerformanceOptimization';
import { EarningsHeader } from './EarningsHeader';
import { EarningsRow } from './EarningsRow';
import { EarningsFilters } from './EarningsFilters';
import { EarningsStats } from './EarningsStats';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { SkeletonTable } from '../ui/SkeletonCard';
import { TABLE_COLUMNS } from './constants';

interface OptimizedEarningsTableProps {
  className?: string;
}

export const OptimizedEarningsTable = memo(function OptimizedEarningsTable({
  className = ''
}: OptimizedEarningsTableProps) {
  // Custom hooks for data management
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

  // Performance optimization
  const { memoizedData, debouncedCallback, isVisible, intersectionRef } = usePerformanceOptimization({
    data: processedData
  });

  // Virtualization
  const {
    parentRef,
    virtualItems,
    totalSize,
    scrollToIndex,
    scrollToTop
  } = useVirtualization({
    data: memoizedData,
    itemHeight: 60,
    overscan: 10,
    containerHeight: 400
  });

  // Memoized event handlers
  const handleSort = useCallback((field: string) => {
    setSortConfig(prev => ({
      field: field as any,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, [setSortConfig]);

  const handleFilterChange = useCallback((newFilterConfig: any) => {
    debouncedCallback(() => {
      setFilterConfig(newFilterConfig);
    }, 300);
  }, [setFilterConfig, debouncedCallback]);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  // Memoized scroll handlers
  const handleScrollToTop = useCallback(() => {
    scrollToTop();
  }, [scrollToTop]);

  // Loading state
  if (isLoading && data.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow ${className}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Loading earnings data...
            </h2>
            <div className="flex items-center gap-2 text-gray-500">
              <LoadingSpinner size="sm" />
              <span className="text-sm">Refreshing...</span>
            </div>
          </div>
          <SkeletonTable />
        </div>
      </div>
    );
  }

  // Error state
  if (error && data.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow ${className}`}>
        <div className="p-6">
          <div className="text-center">
            <div className="text-red-600 text-lg font-semibold mb-2">
              Error loading data
            </div>
            <div className="text-gray-600 mb-4">{error}</div>
            <button
              onClick={handleRefresh}
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
    <div className={`bg-white rounded-lg shadow ${className}`} ref={intersectionRef}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {stats.totalCompanies} companies reporting earnings today
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleScrollToTop}
              className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ↑ Top
            </button>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        
        <EarningsStats stats={stats} isLoading={isLoading} />
      </div>

      {/* Filters */}
      <EarningsFilters
        filterConfig={filterConfig}
        onFilterChange={handleFilterChange}
        stats={stats}
        data={data}
      />

      {/* Virtualized Table */}
      <div className="overflow-hidden">
        <div
          ref={parentRef}
          className="h-96 overflow-auto"
          style={{ contain: 'strict' }} // CSS containment for better performance
        >
          <div style={{ height: `${totalSize}px`, position: 'relative' }}>
            <table className="min-w-full divide-y divide-gray-200">
              <EarningsHeader
                columns={TABLE_COLUMNS}
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <tbody className="bg-white divide-y divide-gray-200">
                {virtualItems.map((virtualItem) => {
                  const item = memoizedData[virtualItem.index];
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
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Showing {memoizedData.length} of {data.length} companies
            {filterConfig.searchTerm && (
              <span className="ml-2 text-blue-600">
                (filtered by "{filterConfig.searchTerm}")
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div>
              Performance: {isVisible ? '🟢 Optimized' : '🟡 Loading'}
            </div>
            <div>
              Last updated: {new Date(stats.lastUpdated).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
