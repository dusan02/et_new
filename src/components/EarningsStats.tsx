'use client';

import { TrendingUp, TrendingDown, DollarSign, Building2 } from 'lucide-react';
import StatCard from './StatCard';
import { trackCardClick } from './Analytics';

interface EarningsStatsProps {
  stats: {
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

export function EarningsStats({ stats }: EarningsStatsProps) {
  // Handle undefined stats gracefully
  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Earnings Statistics</h2>
        <div className="text-gray-500 text-center py-8">
          No statistics available
        </div>
      </div>
    );
  }

  const totalMarketCap = stats.sizeDistribution?.reduce((sum, item) => {
    return sum + (item._sum.marketCap ? Number(item._sum.marketCap) : 0);
  }, 0) || 0;

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
    return `${billions.toFixed(0)}B`;
  };

  const formatPercentage = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatBillions = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    
    // Handle zero case  
    if (value === 0) return '0.0B';
    
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}B`;
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
  const fmtBill = (v?: number) => (v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}B`);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-3 md:gap-4 mb-8">
      {/* BLUE — Size buckets */}
      <StatCard title="LARGE+" main={largePlusCount ?? "—"} sub={formatMarketCap(largePlusCap)} variant="blue" onClick={() => trackCardClick('large_cap')} />
      <StatCard title="MID" main={midCount ?? "—"} sub={formatMarketCap(midCap)} variant="blue" onClick={() => trackCardClick('mid_cap')} />
      <StatCard title="SMALL" main={smallCount ?? "—"} sub={formatMarketCap(smallCap)} variant="blue" onClick={() => trackCardClick('small_cap')} />
      <StatCard title="TOTAL" main={stats.totalEarnings ?? "—"} sub={`${(totalMarketCap / 1e9).toFixed(0)}B`} variant="blue" onClick={() => trackCardClick('total_earnings')} />

      {/* GREEN — Winners */}
      <StatCard title="PRICE" main={topPriceGainer?.ticker ?? "—"} sub={fmtPct(topPriceGainer?.priceChangePercent)} variant="green" onClick={() => trackCardClick('top_price_gainer')} />
      <StatCard title="CAP DIFF" main={topCapGainer?.ticker ?? "—"} sub={fmtBill(topCapGainer?.marketCapDiffBillions)} variant="green" onClick={() => trackCardClick('top_cap_gainer')} />
      <StatCard title="EPS BEAT" main={stats.epsBeat?.ticker ?? "—"} sub={stats.epsBeat && stats.epsBeat.epsEstimate !== 0 ? `+${((stats.epsBeat.epsActual - stats.epsBeat.epsEstimate) / Math.abs(stats.epsBeat.epsEstimate) * 100).toFixed(1)}%` : "—"} variant="green" onClick={() => trackCardClick('eps_beat')} />
      <StatCard title="REV BEAT" main={stats.revenueBeat?.ticker ?? "—"} sub={stats.revenueBeat && Number(stats.revenueBeat.revenueEstimate) !== 0 ? `+${((Number(stats.revenueBeat.revenueActual) - Number(stats.revenueBeat.revenueEstimate)) / Math.abs(Number(stats.revenueBeat.revenueEstimate)) * 100).toFixed(1)}%` : "—"} variant="green" onClick={() => trackCardClick('revenue_beat')} />

      {/* RED — Losers */}
      <StatCard title="PRICE" main={topPriceLoser?.ticker ?? "—"} sub={fmtPct(topPriceLoser?.priceChangePercent)} variant="red" onClick={() => trackCardClick('top_price_loser')} />
      <StatCard title="CAP DIFF" main={topCapLoser?.ticker ?? "—"} sub={fmtBill(topCapLoser?.marketCapDiffBillions)} variant="red" onClick={() => trackCardClick('top_cap_loser')} />
      <StatCard title="EPS MISS" main={stats.epsMiss?.ticker ?? "—"} sub={stats.epsMiss && stats.epsMiss.epsEstimate !== 0 ? `${((stats.epsMiss.epsActual - stats.epsMiss.epsEstimate) / Math.abs(stats.epsMiss.epsEstimate) * 100).toFixed(1)}%` : "—"} variant="red" onClick={() => trackCardClick('eps_miss')} />
      <StatCard title="REV MISS" main={stats.revenueMiss?.ticker ?? "—"} sub={stats.revenueMiss && Number(stats.revenueMiss.revenueEstimate) !== 0 ? `${((Number(stats.revenueMiss.revenueActual) - Number(stats.revenueMiss.revenueEstimate)) / Math.abs(Number(stats.revenueMiss.revenueEstimate)) * 100).toFixed(1)}%` : "—"} variant="red" onClick={() => trackCardClick('revenue_miss')} />
    </div>
  );
}


