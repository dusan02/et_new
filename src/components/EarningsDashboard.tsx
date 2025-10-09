'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { ErrorMessage } from './ui/ErrorMessage';
import { Header } from './Header';
import { Footer } from './Footer';
import { EarningsTableRefactored } from './earnings/EarningsTableRefactored';
import { EarningsStats } from './EarningsStats';
import { ErrorBoundary } from './ErrorBoundary';
import { useEarningsData } from '../hooks/useEarningsData';

interface EarningsData {
  ticker: string;
  reportTime: string | null;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null; // BigInt serialized as number via serializeBigInts()
  revenueActual: number | null; // BigInt serialized as number via serializeBigInts()
  sector: string | null;
  companyType: string | null;
  dataSource: string | null;
  fiscalPeriod: string | null;
  fiscalYear: number | null;
  primaryExchange: string | null;
  // Market data from Polygon
  companyName: string;
  size: string | null;
  marketCap: number | null; // BigInt serialized as number via serializeBigInts()
  marketCapDiff: number | null; // BigInt serialized as number via serializeBigInts()
  marketCapDiffBillions: number | null;
  currentPrice: number | null;
  previousClose: number | null;
  priceChangePercent: number | null;
  sharesOutstanding: number | null; // BigInt serialized as number via serializeBigInts()
  // Guidance calculations
  epsGuideSurprise: number | null;
  epsGuideBasis: string | null;
  epsGuideExtreme: boolean;
  revenueGuideSurprise: number | null;
  revenueGuideBasis: string | null;
  revenueGuideExtreme: boolean;
  // Raw guidance data for debugging
  guidanceData: {
    estimatedEpsGuidance: number | null;
    estimatedRevenueGuidance: string | null;
    epsGuideVsConsensusPct: number | null;
    revenueGuideVsConsensusPct: number | null;
    notes: string | null;
    lastUpdated: string | null;
    fiscalPeriod: string | null;
    fiscalYear: number | null;
  } | null;
  // Surprise calculations
  epsSurprise: number | null;
  revenueSurprise: number | null;
}

interface EarningsMeta {
  total: number;
  ready: boolean;
  lastFetchAt?: string;
  date: string;
}

interface EarningsStats {
  totalEarnings: number;
  withEps: number;
  withRevenue: number;
  sizeDistribution: Array<{
    size: string;
    _count: { size: number };
    _sum: { marketCap: bigint | null };
  }>;
  topGainers: Array<{
    ticker: string;
    companyName: string;
    priceChangePercent: number;
    marketCapDiffBillions: number;
  }>;
  topLosers: Array<{
    ticker: string;
    companyName: string;
    priceChangePercent: number;
    marketCapDiffBillions: number;
  }>;
  epsBeat: {
    ticker: string;
    epsActual: number;
    epsEstimate: number;
  } | null;
  revenueBeat: {
    ticker: string;
    revenueActual: bigint;
    revenueEstimate: bigint;
  } | null;
  epsMiss: {
    ticker: string;
    epsActual: number;
    epsEstimate: number;
  } | null;
  revenueMiss: {
    ticker: string;
    revenueActual: bigint;
    revenueEstimate: bigint;
  } | null;
}

export function EarningsDashboard() {
  const [isClient, setIsClient] = useState(false);
  
  // Use optimized data fetching hook
  const {
    earningsData,
    stats,
    meta,
    lastUpdated,
    isLoading,
    error,
    refresh
  } = useEarningsData();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Prevent hydration mismatch by showing consistent content on server and client
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Don't show full screen loader if we have some data
  const showFullScreenLoader = isLoading && !earningsData.length && !stats;

  if (showFullScreenLoader) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage message={error} onRetry={refresh} />
      </div>
    );
  }

  // If data not ready yet (initial fetch in progress), show loading state
  if (!isLoading && meta && !meta.ready && earningsData.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
        <Header 
          lastUpdated={lastUpdated}
          stats={stats}
        />
        
        <main className="flex-1 flex items-center justify-center py-8" role="main" aria-label="Earnings dashboard main content">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-300 mt-6 mb-2">
              Preparing Today's Earnings Data
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Fetching latest earnings reports...
            </p>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }

  // If no earnings data AND data is ready, show empty state
  if (earningsData.length === 0 && !isLoading && meta?.ready) {
    return (
      <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
        <Header 
          lastUpdated={lastUpdated}
          stats={stats}
        />
        
        <main className="flex-1 flex items-center justify-center py-8" role="main" aria-label="Earnings dashboard main content">
          <div className="text-center">
            {/* Calendar icon with X */}
            <div className="relative inline-block mb-6">
              <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              {/* Red X in top right corner */}
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            
            {/* No Earnings Message */}
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-300 mb-4">No Earnings Scheduled</h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              There are no earnings reports scheduled for today.
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Check back tomorrow for new earnings data.
            </p>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('EarningsDashboard Error:', error, errorInfo);
        // TODO: Send to error tracking service
      }}
    >
      <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
        <Header 
          lastUpdated={lastUpdated}
          stats={stats}
        />
        
        <main className="flex-1 py-8" role="main" aria-label="Earnings dashboard main content">
          <section className="w-full max-w-[1100px] mx-auto px-4" aria-label="Earnings data and statistics">
            <div className="px-0">
              <EarningsTableRefactored
                data={earningsData}
                stats={stats}
                isLoading={isLoading}
                error={error}
                lastUpdated={lastUpdated}
              />
            </div>
          </section>
        </main>
        
        <Footer />
      </div>
    </ErrorBoundary>
  );
}


