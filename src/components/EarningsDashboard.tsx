import React, { useState, useEffect } from 'react';
import { EarningsTableRefactored } from './earnings/EarningsTableRefactored';
import { EarningsStats } from './EarningsStats';

interface EarningsDashboardProps {
  data?: any[];
  stats?: any;
  isLoading?: boolean;
  error?: string | null;
  lastUpdated?: Date | null;
}

export function EarningsDashboard({ 
  data: propData, 
  stats: propStats, 
  isLoading: propIsLoading, 
  error: propError, 
  lastUpdated: propLastUpdated 
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
        
        const response = await fetch('/api/earnings');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'success') {
          setData(result.data || []);
          setStats(result.meta?.stats || null);
          setLastUpdated(new Date());
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

  // Prevent hydration mismatch by ensuring consistent initial state
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Earnings Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Today's earnings reports and market data
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error loading data
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {isClient ? (
              <EarningsTableRefactored
                data={data || []}
                stats={stats}
                isLoading={isLoading}
                error={error}
                lastUpdated={lastUpdated}
              />
            ) : (
              <div className="space-y-4">
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded mb-4"></div>
                  <div className="h-64 bg-gray-200 rounded"></div>
                </div>
              </div>
            )}
          </div>
          
          <div className="lg:col-span-1">
            {isClient ? (
              <EarningsStats
                stats={stats}
                isLoading={isLoading}
                error={error}
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-4 sm:gap-5 md:gap-6 lg:gap-8 mb-8 sm:mb-10 md:mb-12">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="p-4 rounded-lg border-2 bg-gray-100 dark:bg-gray-800 animate-pulse">
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                    <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}