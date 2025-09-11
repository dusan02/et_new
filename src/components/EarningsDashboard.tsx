'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { ErrorMessage } from './ui/ErrorMessage';
import { Header } from './Header';
import { Footer } from './Footer';
import { EarningsTable } from './EarningsTable';
import { EarningsStats } from './EarningsStats';

interface EarningsData {
  ticker: string;
  reportTime: string | null;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: string | null; // BigInt serialized as string
  revenueActual: string | null; // BigInt serialized as string
  sector: string | null;
  companyType: string | null;
  dataSource: string | null;
  fiscalPeriod: string | null;
  fiscalYear: number | null;
  primaryExchange: string | null;
  // Market data from Polygon
  companyName: string;
  size: string | null;
  marketCap: string | null; // BigInt serialized as string
  marketCapDiff: string | null; // BigInt serialized as string
  marketCapDiffBillions: number | null;
  currentPrice: number | null;
  previousClose: number | null;
  priceChangePercent: number | null;
  sharesOutstanding: string | null; // BigInt serialized as string
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
  const [earningsData, setEarningsData] = useState<EarningsData[]>([]);
  const [stats, setStats] = useState<EarningsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [earningsResponse, statsResponse] = await Promise.all([
        fetch('/api/earnings'),
        fetch('/api/earnings/stats'),
      ]);

      if (!earningsResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const earningsResult = await earningsResponse.json();
      const statsResult = await statsResponse.json();

      if (earningsResult.data) {
        setEarningsData(earningsResult.data);
      }

      if (statsResult.success) {
        setStats(statsResult.data);
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Force refresh when component key changes (from parent)
  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading && !earningsData.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage message={error} onRetry={fetchData} />
      </div>
    );
  }

  // If no earnings data, show simplified view
  if (earningsData.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header 
          lastUpdated={lastUpdated}
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Earnings Scheduled</h2>
            <p className="text-gray-600 text-lg">
              There are no earnings reports scheduled for today.
            </p>
            <p className="text-gray-600 text-lg">
              Check back tomorrow for new earnings data.
            </p>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header 
        lastUpdated={lastUpdated}
      />
      
      <main className="flex-1 flex py-8" role="main" aria-label="Earnings dashboard main content">
        {/* Left Ad Space - 15% */}
        <aside className="w-[15%] bg-gray-50" aria-hidden="true" aria-label="Advertisement space">
        </aside>
        
        {/* Main Content - 70% */}
        <section className="w-[70%] px-4" aria-label="Earnings data and statistics">
          {stats && <EarningsStats stats={stats} />}
          <div className="px-0">
            <EarningsTable 
              data={earningsData} 
              isLoading={isLoading}
              onRefresh={fetchData}
            />
          </div>
        </section>
        
        {/* Right Ad Space - 15% */}
        <aside className="w-[15%] bg-gray-50" aria-hidden="true" aria-label="Advertisement space">
        </aside>
      </main>
      
      <Footer />
    </div>
  );
}


