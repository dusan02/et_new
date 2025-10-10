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
    <div className="grid grid-cols-1 gap-3 lg:gap-3">
      {/* BLUE — Size buckets */}
      <div className="w-full rounded-xl border bg-white dark:bg-gray-900 px-3 py-3 shadow-sm">
        <div className="text-[11px] uppercase tracking-wide text-gray-500">LARGE+</div>
        <div className="text-lg font-semibold">{largePlusCount ?? "—"}</div>
        <div className="text-xs text-gray-400">{formatMarketCap(largePlusCap)}</div>
      </div>
      
      <div className="w-full rounded-xl border bg-white dark:bg-gray-900 px-3 py-3 shadow-sm">
        <div className="text-[11px] uppercase tracking-wide text-gray-500">MID</div>
        <div className="text-lg font-semibold">{midCount ?? "—"}</div>
        <div className="text-xs text-gray-400">{formatMarketCap(midCap)}</div>
      </div>
      
      <div className="w-full rounded-xl border bg-white dark:bg-gray-900 px-3 py-3 shadow-sm">
        <div className="text-[11px] uppercase tracking-wide text-gray-500">SMALL</div>
        <div className="text-lg font-semibold">{smallCount ?? "—"}</div>
        <div className="text-xs text-gray-400">{formatMarketCap(smallCap)}</div>
      </div>
      
      <div className="w-full rounded-xl border bg-white dark:bg-gray-900 px-3 py-3 shadow-sm">
        <div className="text-[11px] uppercase tracking-wide text-gray-500">TOTAL</div>
        <div className="text-lg font-semibold">{stats.totalEarnings ?? "—"}</div>
        <div className="text-xs text-gray-400">Earnings</div>
      </div>

      {/* GREEN — Winners */}
      <div className="w-full rounded-xl border bg-green-50 dark:bg-green-900 px-3 py-3 shadow-sm">
        <div className="text-[11px] uppercase tracking-wide text-green-600">PRICE</div>
        <div className="text-lg font-semibold text-green-700">{topPriceGainer?.ticker ?? "—"}</div>
        <div className="text-xs text-green-600">{fmtPct(topPriceGainer?.priceChangePercent)}</div>
      </div>
      
      <div className="w-full rounded-xl border bg-green-50 dark:bg-green-900 px-3 py-3 shadow-sm">
        <div className="text-[11px] uppercase tracking-wide text-green-600">CAP DIFF</div>
        <div className="text-lg font-semibold text-green-700">{topCapGainer?.ticker ?? "—"}</div>
        <div className="text-xs text-green-600">{fmtBill(topCapGainer?.marketCapDiffBillions)}</div>
      </div>
      
      <div className="w-full rounded-xl border bg-green-50 dark:bg-green-900 px-3 py-3 shadow-sm">
        <div className="text-[11px] uppercase tracking-wide text-green-600">EPS BEAT</div>
        <div className="text-lg font-semibold text-green-700">{stats.epsBeat?.ticker ?? "—"}</div>
        <div className="text-xs text-green-600">{stats.epsBeat && stats.epsBeat.epsEstimate !== 0 ? `+${((stats.epsBeat.epsActual - stats.epsBeat.epsEstimate) / Math.abs(stats.epsBeat.epsEstimate) * 100).toFixed(1)}%` : "—"}</div>
      </div>
      
      <div className="w-full rounded-xl border bg-green-50 dark:bg-green-900 px-3 py-3 shadow-sm">
        <div className="text-[11px] uppercase tracking-wide text-green-600">REV BEAT</div>
        <div className="text-lg font-semibold text-green-700">{stats.revenueBeat?.ticker ?? "—"}</div>
        <div className="text-xs text-green-600">{stats.revenueBeat && Number(stats.revenueBeat.revenueEstimate) !== 0 ? `+${((Number(stats.revenueBeat.revenueActual) - Number(stats.revenueBeat.revenueEstimate)) / Math.abs(Number(stats.revenueBeat.revenueEstimate)) * 100).toFixed(1)}%` : "—"}</div>
      </div>

      {/* RED — Losers */}
      <div className="w-full rounded-xl border bg-red-50 dark:bg-red-900 px-3 py-3 shadow-sm">
        <div className="text-[11px] uppercase tracking-wide text-red-600">PRICE</div>
        <div className="text-lg font-semibold text-red-700">{topPriceLoser?.ticker ?? "—"}</div>
        <div className="text-xs text-red-600">{fmtPct(topPriceLoser?.priceChangePercent)}</div>
      </div>
      
      <div className="w-full rounded-xl border bg-red-50 dark:bg-red-900 px-3 py-3 shadow-sm">
        <div className="text-[11px] uppercase tracking-wide text-red-600">CAP DIFF</div>
        <div className="text-lg font-semibold text-red-700">{topCapLoser?.ticker ?? "—"}</div>
        <div className="text-xs text-red-600">{fmtBill(topCapLoser?.marketCapDiffBillions)}</div>
      </div>
      
      <div className="w-full rounded-xl border bg-red-50 dark:bg-red-900 px-3 py-3 shadow-sm">
        <div className="text-[11px] uppercase tracking-wide text-red-600">EPS MISS</div>
        <div className="text-lg font-semibold text-red-700">{stats.epsMiss?.ticker ?? "—"}</div>
        <div className="text-xs text-red-600">{stats.epsMiss && stats.epsMiss.epsEstimate !== 0 ? `${((stats.epsMiss.epsActual - stats.epsMiss.epsEstimate) / Math.abs(stats.epsMiss.epsEstimate) * 100).toFixed(1)}%` : "—"}</div>
      </div>
      
      <div className="w-full rounded-xl border bg-red-50 dark:bg-red-900 px-3 py-3 shadow-sm">
        <div className="text-[11px] uppercase tracking-wide text-red-600">REV MISS</div>
        <div className="text-lg font-semibold text-red-700">{stats.revenueMiss?.ticker ?? "—"}</div>
        <div className="text-xs text-red-600">{stats.revenueMiss && Number(stats.revenueMiss.revenueEstimate) !== 0 ? `${((Number(stats.revenueMiss.revenueActual) - Number(stats.revenueMiss.revenueEstimate)) / Math.abs(Number(stats.revenueMiss.revenueEstimate)) * 100).toFixed(1)}%` : "—"}</div>
      </div>
    </div>
  );
}


