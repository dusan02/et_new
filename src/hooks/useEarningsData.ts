/**
 * 🔄 Earnings Data Hook
 * Optimized data fetching with SWR for better performance and caching
 */

import useSWR from 'swr';
import { useState, useCallback } from 'react';

interface EarningsData {
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
}

interface EarningsStats {
  totalTickers: number;
  totalRevenue: number;
  totalMarketCap: number;
  averagePriceChange: number;
  positiveChanges: number;
  negativeChanges: number;
  zeroChanges: number;
}

interface ApiResponse<T> {
  status: 'success' | 'error' | 'no-data';
  data: T;
  meta?: {
    total: number;
    ready: boolean;
    duration: string;
    date: string;
    requestedDate: string;
    fallbackUsed: boolean;
    cached: boolean;
    cacheAge?: number;
  };
  timestamp: string;
}

// Fetcher function for SWR
const fetcher = async (url: string): Promise<ApiResponse<EarningsData[]>> => {
  const response = await fetch(url, { cache: 'no-store' });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Handle /api/earnings/today response format
  if (url.includes('/api/earnings/today')) {
    // Map Redis data format to frontend format
    const mappedData = (data.data || []).map((item: any) => ({
      ticker: item.ticker,
      companyName: item.name || 'N/A',
      sector: item.sector || 'N/A',
      currentPrice: item.last_price || null,
      priceChangePercent: item.price_change_percent || null,
      marketCap: item.market_cap || null,
      marketCapDiffBillions: item.marketCapDiffBillions || null,
      reportTime: item.report_time || 'TNS',
      epsEstimate: item.eps_est || null,
      epsActual: item.eps_act || null,
      revenueEstimate: item.rev_est || null,
      revenueActual: item.rev_act || null,
      actualPending: item.actual_pending || false,
      source: item.source || 'unknown',
      updatedAt: item.updated_at || new Date().toISOString()
    }));

    return {
      status: data.status,
      data: mappedData,
      meta: {
        total: mappedData.length,
        ready: data.status === 'success',
        duration: '0ms',
        date: data.day,
        requestedDate: data.day,
        fallbackUsed: false,
        cached: false
      },
      timestamp: new Date().toISOString()
    };
  }
  
  return data;
};

const statsFetcher = async (url: string): Promise<ApiResponse<EarningsStats>> => {
  const response = await fetch(url, { cache: 'no-store' });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Handle /api/earnings/stats response format
  if (url.includes('/api/earnings/stats')) {
    return {
      status: data.success ? 'success' : 'error',
      data: data.data,
      meta: {
        total: data.data?.totalEarnings || 0,
        ready: data.success,
        duration: '0ms',
        date: data.data?.requestedDate || new Date().toISOString().split('T')[0],
        requestedDate: data.data?.requestedDate || new Date().toISOString().split('T')[0],
        fallbackUsed: data.data?.fallbackUsed || false,
        cached: false
      },
      timestamp: new Date().toISOString()
    };
  }
  
  return data;
};

export function useEarningsData() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // SWR configuration
  const swrConfig = {
    refreshInterval: 30000, // 30 seconds
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 0, // No deduplication
    revalidateIfStale: true,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
    onSuccess: () => {
      setLastUpdated(new Date());
    }
  };

  // Fetch earnings data
  const { 
    data: earningsResponse, 
    error: earningsError, 
    isLoading: earningsLoading,
    mutate: mutateEarnings
  } = useSWR<ApiResponse<EarningsData[]>>('/api/earnings/today', fetcher, swrConfig);

  // Fetch stats data - temporarily disabled due to database issues
  // const { 
  //   data: statsResponse, 
  //   error: statsError, 
  //   isLoading: statsLoading,
  //   mutate: mutateStats
  // } = useSWR<ApiResponse<EarningsStats>>('/api/earnings/stats', statsFetcher, swrConfig);
  
  // Mock stats response for now
  const statsResponse = {
    status: 'success' as const,
    data: {
      totalEarnings: earningsResponse?.data?.length || 0,
      withEps: 0,
      withRevenue: 0,
      sizeDistribution: [
        { size: 'Large', _count: { size: 2 }, _sum: { marketCap: 5000000000 } },
        { size: 'Mid', _count: { size: 3 }, _sum: { marketCap: 2000000000 } },
        { size: 'Small', _count: { size: 3 }, _sum: { marketCap: 500000000 } }
      ],
      topGainers: [
        { ticker: 'AZZ', companyName: 'AZZ Inc.', priceChangePercent: 0.44, marketCapDiffBillions: 0.0 }
      ],
      topLosers: [
        { ticker: 'RELL', companyName: 'Richardson Electronics Ltd', priceChangePercent: 0.99, marketCapDiffBillions: 0.0 }
      ],
      epsBeat: null,
      revenueBeat: null,
      epsMiss: null,
      revenueMiss: null
    },
    meta: {
      total: earningsResponse?.data?.length || 0,
      ready: true,
      duration: '0ms',
      date: new Date().toISOString().split('T')[0],
      requestedDate: new Date().toISOString().split('T')[0],
      fallbackUsed: false,
      cached: false
    },
    timestamp: new Date().toISOString()
  };
  const statsError = null;
  const statsLoading = false;
  const mutateStats = () => Promise.resolve();

  // Manual refresh function
  const refresh = useCallback(async () => {
    await Promise.all([
      mutateEarnings(),
      mutateStats()
    ]);
    setLastUpdated(new Date());
  }, [mutateEarnings, mutateStats]);

  // Extract data from responses
  const earningsData = earningsResponse?.data || [];
  const stats = statsResponse?.data || null;
  
  // Determine loading state
  const isLoading = earningsLoading || statsLoading;
  
  // Determine error state
  const error = earningsError?.message || statsError?.message || null;

  // Get meta information
  const meta = earningsResponse?.meta || null;

  return {
    // Data
    earningsData,
    stats,
    meta,
    lastUpdated,
    
    // State
    isLoading,
    error,
    
    // Actions
    refresh,
    mutateEarnings,
    mutateStats,
    
    // SWR state
    earningsResponse,
    statsResponse,
    earningsError,
    statsError
  };
}

// Hook for individual API endpoints
export function useEarningsEndpoint<T>(endpoint: string) {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<T>>(
    endpoint,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: false,
      dedupingInterval: 10000,
      errorRetryCount: 3,
      errorRetryInterval: 5000
    }
  );

  return {
    data: data?.data || null,
    meta: data?.meta || null,
    error: error?.message || null,
    isLoading,
    mutate
  };
}

// Hook for real-time updates
export function useEarningsRealtime() {
  const { earningsData, stats, refresh, lastUpdated } = useEarningsData();
  
  // Set up real-time refresh interval
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds default
  
  const startRealtime = useCallback((interval: number = 30000) => {
    setRefreshInterval(interval);
  }, []);
  
  const stopRealtime = useCallback(() => {
    setRefreshInterval(0);
  }, []);
  
  return {
    earningsData,
    stats,
    refresh,
    lastUpdated,
    refreshInterval,
    startRealtime,
    stopRealtime
  };
}
