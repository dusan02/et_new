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
    lastUpdated: string | null;
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

    // TODO: Set up Socket.IO connection for real-time updates when backend is running
    // const { io } = require('socket.io-client');
    // const socket = io('http://localhost:3001', {
    //   transports: ['websocket'],
    //   timeout: 5000,
    // });
    
    // socket.on('connect', () => {
    //   socket.emit('join-earnings');
    // });

    // socket.on('earnings-updated', (data) => {
    //   console.log('Earnings updated:', data);
    //   fetchData();
    // });

    // socket.on('market-data-updated', (data) => {
    //   console.log('Market data updated:', data);
    //   fetchData();
    // });

    // socket.on('disconnect', () => {
    //   console.log('Socket.IO disconnected');
    // });

    // socket.on('connect_error', (error) => {
    //   console.error('Socket.IO error:', error);
    // });

    // return () => {
    //   socket.disconnect();
    // };
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
          <EarningsTable 
            data={earningsData} 
            isLoading={isLoading}
            onRefresh={fetchData}
          />
        </section>
        
        {/* Right Ad Space - 15% */}
        <aside className="w-[15%] bg-gray-50" aria-hidden="true" aria-label="Advertisement space">
        </aside>
      </main>
      
      <Footer />
    </div>
  );
}


