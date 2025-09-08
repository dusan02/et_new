'use client';

import { TrendingUp, TrendingDown, DollarSign, Building2 } from 'lucide-react';
import StatCard from './StatCard';

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
    epsGuidance: {
      ticker: string;
      estimatedEpsGuidance: number;
      lastUpdated: string;
    } | null;
    revenueGuidance: {
      ticker: string;
      estimatedRevenueGuidance: bigint;
      lastUpdated: string;
    } | null;
  };
}

export function EarningsStats({ stats }: EarningsStatsProps) {
  const totalMarketCap = stats.sizeDistribution.reduce((sum, item) => {
    return sum + (item._sum.marketCap ? Number(item._sum.marketCap) : 0);
  }, 0);

  // Calculate market cap distribution
  const largeCount = stats.sizeDistribution.find(d => d.size === 'Large')?._count.size || 0;
  const midCount = stats.sizeDistribution.find(d => d.size === 'Mid')?._count.size || 0;
  const smallCount = stats.sizeDistribution.find(d => d.size === 'Small')?._count.size || 0;
  
  const largeCap = stats.sizeDistribution.find(d => d.size === 'Large')?._sum.marketCap || BigInt(0);
  const midCap = stats.sizeDistribution.find(d => d.size === 'Mid')?._sum.marketCap || BigInt(0);
  const smallCap = stats.sizeDistribution.find(d => d.size === 'Small')?._sum.marketCap || BigInt(0);

  const formatMarketCap = (value: bigint) => {
    const billions = Number(value) / 1e9;
    return `${billions.toFixed(0)}B`;
  };

  const formatPercentage = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatBillions = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}B`;
  };

  // Get best performers
  const topPriceGainer = stats.topGainers[0];
  const topCapGainer = stats.topGainers.reduce((prev, current) => {
    const currentValue = current.marketCapDiffBillions || 0;
    const prevValue = prev.marketCapDiffBillions || 0;
    return currentValue > prevValue ? current : prev;
  }, stats.topGainers[0]);
  
  const topPriceLoser = stats.topLosers[0];
  const topCapLoser = stats.topLosers.reduce((prev, current) => {
    const currentValue = current.marketCapDiffBillions || 0;
    const prevValue = prev.marketCapDiffBillions || 0;
    return currentValue < prevValue ? current : prev;
  }, stats.topLosers[0]);

  // Utility functions
  const fmtPct = (v?: number) => (v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`);
  const fmtBill = (v?: number) => (v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}B`);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-3 md:gap-4 mb-8">
      {/* BLUE — Size buckets */}
      <StatCard title="LARGE+" main={largeCount ?? "—"} sub={formatMarketCap(largeCap)} variant="blue" />
      <StatCard title="MID" main={midCount ?? "—"} sub={formatMarketCap(midCap)} variant="blue" />
      <StatCard title="SMALL" main={smallCount ?? "—"} sub={formatMarketCap(smallCap)} variant="blue" />
      <StatCard title="TOTAL" main={stats.totalEarnings ?? "—"} sub={`${(totalMarketCap / 1e9).toFixed(0)}B`} variant="blue" />

      {/* GREEN — Winners */}
      <StatCard title="PRICE" main={topPriceGainer?.ticker ?? "—"} sub={fmtPct(topPriceGainer?.priceChangePercent)} variant="green" />
      <StatCard title="CAP DIFF" main={topCapGainer?.ticker ?? "—"} sub={fmtBill(topCapGainer?.marketCapDiffBillions)} variant="green" />
      <StatCard title="EPS BEAT" main={stats.epsGuidance?.ticker ?? "—"} sub={stats.epsGuidance?.estimatedEpsGuidance ? `$${stats.epsGuidance.estimatedEpsGuidance.toFixed(2)}` : "—"} variant="green" />
      <StatCard title="REV BEAT" main={stats.revenueGuidance?.ticker ?? "—"} sub={stats.revenueGuidance?.estimatedRevenueGuidance ? `$${(Number(stats.revenueGuidance.estimatedRevenueGuidance) / 1e9).toFixed(1)}B` : "—"} variant="green" />

      {/* RED — Losers */}
      <StatCard title="PRICE" main={topPriceLoser?.ticker ?? "—"} sub={fmtPct(topPriceLoser?.priceChangePercent)} variant="red" />
      <StatCard title="CAP DIFF" main={topCapLoser?.ticker ?? "—"} sub={fmtBill(topCapLoser?.marketCapDiffBillions)} variant="red" />
      <StatCard title="EPS MISS" main="—" sub="—" variant="red" />
      <StatCard title="REV MISS" main="—" sub="—" variant="red" />
    </div>
  );
}


