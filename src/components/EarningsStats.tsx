'use client';

import React from 'react';

type Stats = {
  totalEarnings: number;
  withEps: number;
  withRevenue: number;
  sizeDistribution: Array<{ size: string; _count: { size: number }; _sum: { marketCap: number } }>;
  topGainers: Array<{ ticker: string; companyName: string; priceChangePercent: number; marketCapDiffBillions: number }>;
  topLosers: Array<{ ticker: string; companyName: string; priceChangePercent: number; marketCapDiffBillions: number }>;
  epsBeat: any;
  revenueBeat: any;
  epsMiss: any;
  revenueMiss: any;
};

export default function EarningsStats({
  stats,
  loading,
}: {
  stats: Stats | null | undefined;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-24 w-24 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-sm text-gray-500">
        No stats available for today.
      </div>
    );
  }

  // Calculate market cap distribution
  const megaCount = stats.sizeDistribution?.find(d => d.size === 'Mega')?._count.size || 0;
  const largeCount = stats.sizeDistribution?.find(d => d.size === 'Large')?._count.size || 0;
  const midCount = stats.sizeDistribution?.find(d => d.size === 'Mid')?._count.size || 0;
  const smallCount = stats.sizeDistribution?.find(d => d.size === 'Small')?._count.size || 0;
  
  // Large + includes both Mega and Large
  const largePlusCount = megaCount + largeCount;
  
  const megaCap = Number(stats.sizeDistribution?.find(d => d.size === 'Mega')?._sum.marketCap || 0);
  const largeCap = Number(stats.sizeDistribution?.find(d => d.size === 'Large')?._sum.marketCap || 0);
  const midCap = Number(stats.sizeDistribution?.find(d => d.size === 'Mid')?._sum.marketCap || 0);
  const smallCap = Number(stats.sizeDistribution?.find(d => d.size === 'Small')?._sum.marketCap || 0);
  
  // Large + market cap includes both Mega and Large
  const largePlusCap = megaCap + largeCap;
  
  // Calculate total market cap
  const totalMarketCap = megaCap + largeCap + midCap + smallCap;

  const formatMarketCap = (value: number | bigint) => {
    const numValue = typeof value === 'bigint' ? Number(value) : value;
    const billions = numValue / 1e9;
    return `${billions.toFixed(0)} B`;
  };

  const formatPercentage = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatBillions = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    
    // Handle zero case  
    if (value === 0) return '0.0 B';
    
    return `${value > 0 ? '+' : ''}${value.toFixed(1)} B`;
  };

  // Get best performers
  const topPriceGainer = stats.topGainers?.[0];
  const topCapGainer = stats.topGainers?.length ? stats.topGainers.reduce((prev, current) => {
    const currentValue = current.marketCapDiffBillions || 0;
    const prevValue = prev.marketCapDiffBillions || 0;
    return currentValue > prevValue ? current : prev;
  }, stats.topGainers[0]) : undefined;
  
  const topPriceLoser = stats.topLosers?.[0];
  const topCapLoser = stats.topLosers?.length ? stats.topLosers.reduce((prev, current) => {
    const currentValue = current.marketCapDiffBillions || 0;
    const prevValue = prev.marketCapDiffBillions || 0;
    return currentValue < prevValue ? current : prev;
  }, stats.topLosers[0]) : undefined;

  // Utility functions
  const fmtPct = (v?: number) => (v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`);
  const fmtBill = (v?: number) => (v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)} B`);

  return (
    <div className="flex flex-nowrap justify-center gap-2 sm:gap-3 md:gap-4 overflow-x-auto">
      {/* BLUE — Size buckets */}
      <div className="group relative rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm min-w-[80px] sm:min-w-[90px] md:min-w-[100px] flex-shrink-0">
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600 z-10 rounded-t-xl"></div>
        <div className="relative p-3 pt-4 pb-4 bg-white dark:bg-gray-800 text-center">
          <div className="text-[12px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">LARGE+</div>
          <div className="text-[16px] font-bold text-blue-800 dark:text-blue-200 mb-1 leading-tight">{largePlusCount ?? "—"}</div>
          <div className="text-[12px] font-bold text-blue-600 dark:text-blue-400">{formatMarketCap(largePlusCap)}</div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 z-10 rounded-b-xl"></div>
      </div>
      
      <div className="group relative rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm min-w-[80px] sm:min-w-[90px] md:min-w-[100px] flex-shrink-0">
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600 z-10 rounded-t-xl"></div>
        <div className="relative p-3 pt-4 pb-4 bg-white dark:bg-gray-800 text-center">
          <div className="text-[12px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">MID</div>
          <div className="text-[16px] font-bold text-blue-800 dark:text-blue-200 mb-1 leading-tight">{midCount ?? "—"}</div>
          <div className="text-[12px] font-bold text-blue-600 dark:text-blue-400">{formatMarketCap(midCap)}</div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 z-10 rounded-b-xl"></div>
      </div>
      
      <div className="group relative rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm min-w-[80px] sm:min-w-[90px] md:min-w-[100px] flex-shrink-0">
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600 z-10 rounded-t-xl"></div>
        <div className="relative p-3 pt-4 pb-4 bg-white dark:bg-gray-800 text-center">
          <div className="text-[12px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">SMALL</div>
          <div className="text-[16px] font-bold text-blue-800 dark:text-blue-200 mb-1 leading-tight">{smallCount ?? "—"}</div>
          <div className="text-[12px] font-bold text-blue-600 dark:text-blue-400">{formatMarketCap(smallCap)}</div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 z-10 rounded-b-xl"></div>
      </div>
      
      <div className="group relative rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm min-w-[80px] sm:min-w-[90px] md:min-w-[100px] flex-shrink-0">
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600 z-10 rounded-t-xl"></div>
        <div className="relative p-3 pt-4 pb-4 bg-white dark:bg-gray-800 text-center">
          <div className="text-[12px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">TOTAL</div>
          <div className="text-[16px] font-bold text-blue-800 dark:text-blue-200 mb-1 leading-tight">{stats.totalEarnings ?? "—"}</div>
          <div className="text-[12px] font-bold text-blue-600 dark:text-blue-400">{formatMarketCap(totalMarketCap)}</div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 z-10 rounded-b-xl"></div>
      </div>

      {/* GREEN — Winners */}
      <div className="group relative rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm min-w-[80px] sm:min-w-[90px] md:min-w-[100px] flex-shrink-0">
        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600 z-10 rounded-t-xl"></div>
        <div className="relative p-3 pt-4 pb-4 bg-white dark:bg-gray-800 text-center">
          <div className="text-[12px] font-bold uppercase tracking-widest text-green-600 dark:text-green-400 mb-2">PRICE</div>
          <div className="text-[16px] font-bold text-green-800 dark:text-green-200 mb-1 leading-tight">{topPriceGainer?.ticker ?? "—"}</div>
          <div className="text-[12px] font-bold text-green-600 dark:text-green-400">{fmtPct(topPriceGainer?.priceChangePercent)}</div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 z-10 rounded-b-xl"></div>
      </div>
      
      <div className="group relative rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm min-w-[80px] sm:min-w-[90px] md:min-w-[100px] flex-shrink-0">
        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600 z-10 rounded-t-xl"></div>
        <div className="relative p-3 pt-4 pb-4 bg-white dark:bg-gray-800 text-center">
          <div className="text-[12px] font-bold uppercase tracking-widest text-green-600 dark:text-green-400 mb-2">CAP DIFF</div>
          <div className="text-[16px] font-bold text-green-800 dark:text-green-200 mb-1 leading-tight">{topCapGainer?.ticker ?? "—"}</div>
          <div className="text-[12px] font-bold text-green-600 dark:text-green-400">{fmtBill(topCapGainer?.marketCapDiffBillions)}</div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 z-10 rounded-b-xl"></div>
      </div>
      
      <div className="group relative rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm min-w-[80px] sm:min-w-[90px] md:min-w-[100px] flex-shrink-0">
        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600 z-10 rounded-t-xl"></div>
        <div className="relative p-3 pt-4 pb-4 bg-white dark:bg-gray-800 text-center">
          <div className="text-[12px] font-bold uppercase tracking-widest text-green-600 dark:text-green-400 mb-2">EPS BEAT</div>
          <div className="text-[16px] font-bold text-green-800 dark:text-green-200 mb-1 leading-tight">{stats.epsBeat?.ticker ?? "—"}</div>
          <div className="text-[12px] font-bold text-green-600 dark:text-green-400">{stats.epsBeat && stats.epsBeat.epsEstimate !== 0 ? `+${((stats.epsBeat.epsActual - stats.epsBeat.epsEstimate) / Math.abs(stats.epsBeat.epsEstimate) * 100).toFixed(1)}%` : "—"}</div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 z-10 rounded-b-xl"></div>
      </div>
      
      <div className="group relative rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm min-w-[80px] sm:min-w-[90px] md:min-w-[100px] flex-shrink-0">
        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600 z-10 rounded-t-xl"></div>
        <div className="relative p-3 pt-4 pb-4 bg-white dark:bg-gray-800 text-center">
          <div className="text-[12px] font-bold uppercase tracking-widest text-green-600 dark:text-green-400 mb-2">REV BEAT</div>
          <div className="text-[16px] font-bold text-green-800 dark:text-green-200 mb-1 leading-tight">{stats.revenueBeat?.ticker ?? "—"}</div>
          <div className="text-[12px] font-bold text-green-600 dark:text-green-400">{stats.revenueBeat && Number(stats.revenueBeat.revenueEstimate) !== 0 ? `+${((Number(stats.revenueBeat.revenueActual) - Number(stats.revenueBeat.revenueEstimate)) / Math.abs(Number(stats.revenueBeat.revenueEstimate)) * 100).toFixed(1)}%` : "—"}</div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 z-10 rounded-b-xl"></div>
      </div>

      {/* RED — Losers */}
      <div className="group relative rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm min-w-[80px] sm:min-w-[90px] md:min-w-[100px] flex-shrink-0">
        <div className="absolute top-0 left-0 right-0 h-1 bg-rose-600 z-10 rounded-t-xl"></div>
        <div className="relative p-3 pt-4 pb-4 bg-white dark:bg-gray-800 text-center">
          <div className="text-[12px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400 mb-2">PRICE</div>
          <div className="text-[16px] font-bold text-red-800 dark:text-red-200 mb-1 leading-tight">{topPriceLoser?.ticker ?? "—"}</div>
          <div className="text-[12px] font-bold text-red-600 dark:text-red-400">{fmtPct(topPriceLoser?.priceChangePercent)}</div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-600 z-10 rounded-b-xl"></div>
      </div>
      
      <div className="group relative rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm min-w-[80px] sm:min-w-[90px] md:min-w-[100px] flex-shrink-0">
        <div className="absolute top-0 left-0 right-0 h-1 bg-rose-600 z-10 rounded-t-xl"></div>
        <div className="relative p-3 pt-4 pb-4 bg-white dark:bg-gray-800 text-center">
          <div className="text-[12px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400 mb-2">CAP DIFF</div>
          <div className="text-[16px] font-bold text-red-800 dark:text-red-200 mb-1 leading-tight">{topCapLoser?.ticker ?? "—"}</div>
          <div className="text-[12px] font-bold text-red-600 dark:text-red-400">{fmtBill(topCapLoser?.marketCapDiffBillions)}</div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-600 z-10 rounded-b-xl"></div>
      </div>
      
      <div className="group relative rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm min-w-[80px] sm:min-w-[90px] md:min-w-[100px] flex-shrink-0">
        <div className="absolute top-0 left-0 right-0 h-1 bg-rose-600 z-10 rounded-t-xl"></div>
        <div className="relative p-3 pt-4 pb-4 bg-white dark:bg-gray-800 text-center">
          <div className="text-[12px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400 mb-2">EPS MISS</div>
          <div className="text-[16px] font-bold text-red-800 dark:text-red-200 mb-1 leading-tight">{stats.epsMiss?.ticker ?? "—"}</div>
          <div className="text-[12px] font-bold text-red-600 dark:text-red-400">{stats.epsMiss && stats.epsMiss.epsEstimate !== 0 ? `${((stats.epsMiss.epsActual - stats.epsMiss.epsEstimate) / Math.abs(stats.epsMiss.epsEstimate) * 100).toFixed(1)}%` : "—"}</div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-600 z-10 rounded-b-xl"></div>
      </div>
      
      <div className="group relative rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm min-w-[80px] sm:min-w-[90px] md:min-w-[100px] flex-shrink-0">
        <div className="absolute top-0 left-0 right-0 h-1 bg-rose-600 z-10 rounded-t-xl"></div>
        <div className="relative p-3 pt-4 pb-4 bg-white dark:bg-gray-800 text-center">
          <div className="text-[12px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400 mb-2">REV MISS</div>
          <div className="text-[16px] font-bold text-red-800 dark:text-red-200 mb-1 leading-tight">{stats.revenueMiss?.ticker ?? "—"}</div>
          <div className="text-[12px] font-bold text-red-600 dark:text-red-400">{stats.revenueMiss && Number(stats.revenueMiss.revenueEstimate) !== 0 ? `${((Number(stats.revenueMiss.revenueActual) - Number(stats.revenueMiss.revenueEstimate)) / Math.abs(Number(stats.revenueMiss.revenueEstimate)) * 100).toFixed(1)}%` : "—"}</div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-600 z-10 rounded-b-xl"></div>
      </div>
    </div>
  );
}


