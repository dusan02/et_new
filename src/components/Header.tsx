'use client';

import { Clock, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ThemeToggle } from './ui/ThemeToggle';
import { CardsToggle } from './ui/CardsToggle';
import EarningsStats from './EarningsStats';

interface HeaderProps {
  lastUpdated: Date | null;
  stats?: {
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
  };
}

export function Header({ lastUpdated, stats }: HeaderProps) {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [showCards, setShowCards] = useState(() => {
    // Load from localStorage on initial render
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('showCards');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });

  // Initialize date on client side
  useEffect(() => {
    setCurrentDate(new Date());
    
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Save showCards state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('showCards', JSON.stringify(showCards));
    }
  }, [showCards]);

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <header className="relative overflow-hidden bg-white dark:bg-gray-900 transition-colors duration-300" role="banner">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%236366f1' fill-opacity='0.03'%3E%3Ccircle cx='20' cy='20' r='1'/%3E%3C/g%3E%3C/svg%3E")`
      }}></div>
      
      {/* Subtle Background Elements - removed white balls */}

      <div className="relative w-full px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="text-center">
          {/* Main Title */}
          <div className="mb-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-800 via-blue-700 to-indigo-700 dark:from-gray-200 dark:via-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2 sm:mb-3 tracking-tight">
              EARNINGS TABLE
            </h1>
            <div className="w-16 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 mx-auto rounded-full"></div>
          </div>

          {/* Date and Status */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-700 shadow-sm">
              <Clock className="h-4 w-4 text-gray-600 dark:text-gray-300" aria-hidden="true" />
              {currentDate ? (
                <time 
                  className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300" 
                  dateTime={currentDate.toISOString()}
                  aria-label={`Current date: ${currentDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}`}
                >
                  {currentDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              ) : (
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  Loading...
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-2 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 border border-green-200 dark:border-green-800 shadow-sm">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <RefreshCw className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden="true" />
              <span className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">Autorefresh</span>
            </div>
            <ThemeToggle />
            <CardsToggle isVisible={showCards} onToggle={setShowCards} />
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xl mx-auto leading-relaxed px-2">
            Real-time earnings data with live market updates, EPS surprises, and revenue beats
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className={`mt-8 mb-12 overflow-hidden transition-all duration-500 ease-in-out ${
            showCards 
              ? 'max-h-[500px] opacity-100' 
              : 'max-h-0 opacity-0'
          }`}>
            <EarningsStats stats={stats} />
          </div>
        )}
      </div>
    </header>
  );
}



