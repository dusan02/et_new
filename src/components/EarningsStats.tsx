'use client';

import { TrendingUp, TrendingDown, DollarSign, Building2 } from 'lucide-react';

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

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatBillions = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}B`;
  };

  // Get best performers
  const topPriceGainer = stats.topGainers[0];
  const topCapGainer = stats.topGainers.reduce((prev, current) => 
    (current.marketCapDiffBillions > prev.marketCapDiffBillions) ? current : prev, stats.topGainers[0]
  );
  
  const topPriceLoser = stats.topLosers[0];
  const topCapLoser = stats.topLosers.reduce((prev, current) => 
    (current.marketCapDiffBillions < prev.marketCapDiffBillions) ? current : prev, stats.topLosers[0]
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-3 mb-8">
      {/* Market Cap Categories - Blue Cards */}
      <div className="bg-white rounded-lg border-l-4 border-l-blue-500 border border-gray-200 p-4 text-center hover:shadow-md transition-shadow cursor-pointer">
        <div className="text-xs font-medium text-blue-600 mb-1">LARGE +</div>
        <div className="text-lg font-bold text-gray-900">{largeCount}</div>
        <div className="text-sm text-gray-600">{formatMarketCap(largeCap)}</div>
      </div>

      <div className="bg-white rounded-lg border-l-4 border-l-blue-500 border border-gray-200 p-4 text-center hover:shadow-md transition-shadow cursor-pointer">
        <div className="text-xs font-medium text-blue-600 mb-1">MID</div>
        <div className="text-lg font-bold text-gray-900">{midCount}</div>
        <div className="text-sm text-gray-600">{formatMarketCap(midCap)}</div>
      </div>

      <div className="bg-white rounded-lg border-l-4 border-l-blue-500 border border-gray-200 p-4 text-center hover:shadow-md transition-shadow cursor-pointer">
        <div className="text-xs font-medium text-blue-600 mb-1">SMALL</div>
        <div className="text-lg font-bold text-gray-900">{smallCount}</div>
        <div className="text-sm text-gray-600">{formatMarketCap(smallCap)}</div>
      </div>

      <div className="bg-white rounded-lg border-l-4 border-l-blue-500 border border-gray-200 p-4 text-center hover:shadow-md transition-shadow cursor-pointer">
        <div className="text-xs font-medium text-blue-600 mb-1">TOTAL CAP</div>
        <div className="text-lg font-bold text-gray-900">{stats.totalEarnings}</div>
        <div className="text-sm text-gray-600">{(totalMarketCap / 1e9).toFixed(0)}B</div>
      </div>

      {/* Winners - Green Cards */}
      <div className="bg-white rounded-lg border-l-4 border-l-green-500 border border-gray-200 p-4 text-center hover:shadow-md transition-shadow cursor-pointer">
        <div className="text-xs font-medium text-green-600 mb-1">PRICE (%)</div>
        <div className="text-lg font-bold text-gray-900">{topPriceGainer?.ticker || '-'}</div>
        <div className="text-sm text-green-600">{topPriceGainer ? formatPercentage(topPriceGainer.priceChangePercent) : '-'}</div>
      </div>

      <div className="bg-white rounded-lg border-l-4 border-l-green-500 border border-gray-200 p-4 text-center hover:shadow-md transition-shadow cursor-pointer">
        <div className="text-xs font-medium text-green-600 mb-1">CAP DIFF</div>
        <div className="text-lg font-bold text-gray-900">{topCapGainer?.ticker || '-'}</div>
        <div className="text-sm text-green-600">{topCapGainer ? formatBillions(topCapGainer.marketCapDiffBillions) : '-'}</div>
      </div>

      <div className="bg-white rounded-lg border-l-4 border-l-green-500 border border-gray-200 p-4 text-center hover:shadow-md transition-shadow cursor-pointer">
        <div className="text-xs font-medium text-green-600 mb-1">EPS BEAT</div>
        <div className="text-lg font-bold text-gray-900">AAPL</div>
        <div className="text-sm text-green-600">+1.3%</div>
      </div>

      <div className="bg-white rounded-lg border-l-4 border-l-green-500 border border-gray-200 p-4 text-center hover:shadow-md transition-shadow cursor-pointer">
        <div className="text-xs font-medium text-green-600 mb-1">REV BEAT</div>
        <div className="text-lg font-bold text-gray-900">MSFT</div>
        <div className="text-sm text-green-600">+2.5%</div>
      </div>

      {/* Losers - Red Cards */}
      <div className="bg-white rounded-lg border-l-4 border-l-red-500 border border-gray-200 p-4 text-center hover:shadow-md transition-shadow cursor-pointer">
        <div className="text-xs font-medium text-red-600 mb-1">PRICE (%)</div>
        <div className="text-lg font-bold text-gray-900">{topPriceLoser?.ticker || '-'}</div>
        <div className="text-sm text-red-600">{topPriceLoser ? formatPercentage(topPriceLoser.priceChangePercent) : '-'}</div>
      </div>

      <div className="bg-white rounded-lg border-l-4 border-l-red-500 border border-gray-200 p-4 text-center hover:shadow-md transition-shadow cursor-pointer">
        <div className="text-xs font-medium text-red-600 mb-1">CAP DIFF</div>
        <div className="text-lg font-bold text-gray-900">{topCapLoser?.ticker || '-'}</div>
        <div className="text-sm text-red-600">{topCapLoser ? formatBillions(topCapLoser.marketCapDiffBillions) : '-'}</div>
      </div>

      <div className="bg-white rounded-lg border-l-4 border-l-red-500 border border-gray-200 p-4 text-center hover:shadow-md transition-shadow cursor-pointer">
        <div className="text-xs font-medium text-red-600 mb-1">EPS MISS</div>
        <div className="text-lg font-bold text-gray-900">GOOGL</div>
        <div className="text-sm text-red-600">-0.8%</div>
      </div>

      <div className="bg-white rounded-lg border-l-4 border-l-red-500 border border-gray-200 p-4 text-center hover:shadow-md transition-shadow cursor-pointer">
        <div className="text-xs font-medium text-red-600 mb-1">REV MISS</div>
        <div className="text-lg font-bold text-gray-900">TSLA</div>
        <div className="text-sm text-red-600">-1.2%</div>
      </div>
    </div>
  );
}
