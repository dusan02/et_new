/**
 * 🚀 EARNINGS DATA HOOK
 * Custom hook pre optimalizované spracovanie earnings dát
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { EarningsData, EarningsStats, SortConfig, FilterConfig } from '../types';
import { filterData, sortData } from '../utils';

interface UseEarningsDataOptions {
  initialData?: EarningsData[];
  initialStats?: EarningsStats;
  debounceMs?: number;
}

interface UseEarningsDataReturn {
  data: EarningsData[];
  stats: EarningsStats;
  isLoading: boolean;
  error: string | null;
  processedData: EarningsData[];
  sortConfig: SortConfig;
  filterConfig: FilterConfig;
  setSortConfig: (config: SortConfig) => void;
  setFilterConfig: (config: FilterConfig) => void;
  refresh: () => void;
}

export function useEarningsData({
  initialData = [],
  initialStats = {
    totalCompanies: 0,
    withEpsActual: 0,
    withRevenueActual: 0,
    withBothActual: 0,
    withoutAnyActual: 0,
    lastUpdated: new Date().toISOString()
  },
  debounceMs = 300
}: UseEarningsDataOptions = {}): UseEarningsDataReturn {
  const [data, setData] = useState<EarningsData[]>(initialData);
  const [stats, setStats] = useState<EarningsStats>(initialStats);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: null,
    direction: 'asc'
  });
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    searchTerm: '',
    showOnlyWithActual: false,
    sizeFilter: null,
    sectorFilter: null
  });

  // Debounced filter config for performance
  const [debouncedFilterConfig, setDebouncedFilterConfig] = useState<FilterConfig>(filterConfig);

  // Debounce filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilterConfig(filterConfig);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [filterConfig, debounceMs]);

  // Memoized processed data
  const processedData = useMemo(() => {
    const filtered = filterData(data, debouncedFilterConfig);
    return sortData(filtered, sortConfig);
  }, [data, debouncedFilterConfig, sortConfig]);

  // Fetch data function
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch both data and stats in parallel
      const [earningsResponse, statsResponse] = await Promise.all([
        fetch('/api/earnings'),
        fetch('/api/earnings/stats')
      ]);
      
      if (!earningsResponse.ok) {
        throw new Error(`HTTP error! status: ${earningsResponse.status}`);
      }
      
      if (!statsResponse.ok) {
        throw new Error(`HTTP error! status: ${statsResponse.status}`);
      }
      
      const [earningsResult, statsResult] = await Promise.all([
        earningsResponse.json(),
        statsResponse.json()
      ]);
      
      setData(earningsResult.data || []);
      setStats(statsResult.data || initialStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [initialStats]);

  // Refresh function
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh on mount
  useEffect(() => {
    if (data.length === 0) {
      fetchData();
    }
  }, [data.length, fetchData]);

  return {
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
  };
}
