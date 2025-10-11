import React, { useState, useEffect, useMemo } from 'react';
import { EarningsTableRefactored } from './earnings/EarningsTableRefactored';

interface EarningsDashboardProps {
  data?: any[];
  stats?: any;
  isLoading?: boolean;
  error?: string | null;
  lastUpdated?: Date | null;
  onLastUpdatedChange?: (date: Date | null) => void;
  onStatsChange?: (stats: any) => void;
}

export function EarningsDashboard({ 
  data: propData, 
  stats: propStats, 
  isLoading: propIsLoading, 
  error: propError, 
  lastUpdated: propLastUpdated,
  onLastUpdatedChange,
  onStatsChange
}: EarningsDashboardProps) {
  const [data, setData] = useState<any[]>(propData || []);
  const [stats, setStats] = useState<any>(propStats || null);
  const [isLoading, setIsLoading] = useState<boolean>(propIsLoading || true);
  const [error, setError] = useState<string | null>(propError || null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(propLastUpdated || null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/earnings?nocache=1');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'success') {
          console.log('[DEBUG] API response:', { data: result.data?.length, stats: result.meta?.stats });
          setData(result.data || []);
          const newStats = result.meta?.stats || null;
          setStats(newStats);
          onStatsChange?.(newStats);
          const newLastUpdated = new Date();
          setLastUpdated(newLastUpdated);
          onLastUpdatedChange?.(newLastUpdated);
          
          // Self-test logs
          console.log('[TEST] items=', result.data?.length, 'stats=', result.meta?.stats);
        } else {
          throw new Error(result.message || 'Failed to fetch data');
        }
      } catch (err) {
        console.error('Error fetching earnings data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if no data was passed as props
    if (!propData) {
      fetchData();
    }
  }, [propData]);

  // Memoize stats to ensure consistent object reference
  const memoizedStats = useMemo(() => stats ?? null, [stats]);
  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-2">
              <h3 className="text-sm font-medium text-red-800">
                Error loading data
              </h3>
              <div className="mt-1 text-sm text-red-700">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      <EarningsTableRefactored
        data={data || []}
        stats={memoizedStats}
        isLoading={isLoading}
        error={error}
        lastUpdated={lastUpdated}
      />
    </div>
  );
}