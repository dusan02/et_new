'use client';

import { formatRevenueSmart } from '@/modules/shared';

// Define EarningsData interface locally since we removed the types file
interface EarningsData {
  ticker: string;
  reportTime: string | null;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | bigint | null;
  revenueActual: number | bigint | null;
  sector: string | null;
  companyType: string | null;
  dataSource: string | null;
  fiscalPeriod: string | null;
  fiscalYear: number | null;
  primaryExchange: string | null;
  companyName: string;
  size: string | null;
  marketCap: number | null;
  marketCapDiff: number | null;
  marketCapDiffBillions: number | null;
  currentPrice: number | null;
  previousClose: number | null;
  priceChangePercent: number | null;
  sharesOutstanding: number | null;
  debug?: {
    ticker: string;
    currentPrice: number | null;
    previousClose: number | null;
    priceChangePercent: number | null;
    currentPriceType: string;
    previousCloseType: string;
    priceChangePercentType: string;
    marketInfoSource: string;
  };
}

interface MobileCardProps {
  item: EarningsData;
  index: number;
}

// Helper functions
function getSurpriseColor(actual: number | bigint, estimate: number | bigint): string {
  const actualNum = Number(actual);
  const estimateNum = Number(estimate);
  if (actualNum > estimateNum) return 'text-green-600 dark:text-green-400';
  if (actualNum < estimateNum) return 'text-red-600 dark:text-red-400';
  return 'text-gray-500 dark:text-gray-400';
}

function getSurpriseText(actual: number | bigint, estimate: number | bigint): string {
  const actualNum = Number(actual);
  const estimateNum = Number(estimate);
  if (estimateNum === 0) return '-';
  const surprise = ((actualNum - estimateNum) / Math.abs(estimateNum)) * 100;
  return `${surprise >= 0 ? '+' : ''}${surprise.toFixed(1)}%`;
}

export function MobileCard({ item, index }: MobileCardProps) {
  return (
    <div
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 mb-2 shadow-sm hover:shadow-md transition-all duration-300 ease-in-out animate-slide-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">#{index + 1}</span>
          {item.size && (
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                item.size === 'Mega'
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : item.size === 'Large'
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  : 'text-gray-600'
              }`}
            >
              {item.size}
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 dark:text-gray-400">Report Time</div>
          <div className="font-medium text-sm text-gray-900 dark:text-white">
            {item.reportTime || '-'}
          </div>
        </div>
      </div>

      {/* Company Info */}
      <div className="text-center mb-2">
        <div className="font-semibold text-gray-900 dark:text-white text-base">{item.ticker}</div>
        <div className="text-xs text-gray-500 dark:text-gray-300">{item.companyName}</div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700 rounded">
          <div className="text-xs text-gray-500 dark:text-gray-300">Market Cap</div>
          <div className="font-semibold text-sm text-gray-900 dark:text-white">
            {item.marketCap ? `$${(Number(item.marketCap) / 1_000_000_000).toFixed(1)}B` : '-'}
          </div>
        </div>
        <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700 rounded">
          <div className="text-xs text-gray-500 dark:text-gray-300">Price</div>
          <div className="font-semibold text-sm text-gray-900 dark:text-white">
            {item.currentPrice ? `$${item.currentPrice.toFixed(2)}` : '-'}
          </div>
        </div>
      </div>

      {/* Changes */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700 rounded">
          <div className="text-xs text-gray-500 dark:text-gray-300">Cap Diff</div>
          <div
            className={`font-semibold text-sm ${
              item.marketCapDiffBillions !== null
                ? item.marketCapDiffBillions >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {item.marketCapDiffBillions !== null
              ? `${item.marketCapDiffBillions >= 0 ? '+' : ''}${item.marketCapDiffBillions.toFixed(1)}B`
              : '-'}
          </div>
        </div>
        <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700 rounded">
          <div className="text-xs text-gray-500 dark:text-gray-300">Change</div>
          <div
            className={`font-semibold text-sm ${
              item.priceChangePercent !== null
                ? item.priceChangePercent >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {item.priceChangePercent !== null
              ? `${item.priceChangePercent >= 0 ? '+' : ''}${item.priceChangePercent.toFixed(2)}%`
              : '-'}
          </div>
          {process.env.NODE_ENV === 'development' && item.debug && (
            <div className="text-xs text-gray-400 mt-1">
              curr={item.debug.currentPrice} prev={item.debug.previousClose}
            </div>
          )}
        </div>
      </div>

      {/* EPS & Revenue Data - Two Column Layout */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        {/* Left Column - EPS Data */}
        <div className="space-y-1">
          <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="text-xs text-gray-500 dark:text-gray-300">EPS Est</div>
            <div className="font-semibold text-sm text-gray-900 dark:text-white">
              {item.epsEstimate ? `$${item.epsEstimate.toFixed(2)}` : '-'}
            </div>
          </div>
          <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="text-xs text-gray-500 dark:text-gray-300">EPS Act</div>
            <div className="font-semibold text-sm text-gray-900 dark:text-white">
              {item.epsActual ? `$${item.epsActual.toFixed(2)}` : '-'}
            </div>
          </div>
          <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="text-xs text-gray-500 dark:text-gray-300">EPS Surp</div>
            <div
              className={`font-semibold text-sm ${
                item.epsActual && item.epsEstimate
                  ? getSurpriseColor(item.epsActual, item.epsEstimate)
                  : 'text-gray-900 dark:text-white'
              }`}
            >
              {item.epsActual && item.epsEstimate
                ? getSurpriseText(item.epsActual, item.epsEstimate)
                : '-'}
            </div>
          </div>
        </div>

        {/* Right Column - Revenue Data */}
        <div className="space-y-1">
          <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="text-xs text-gray-500 dark:text-gray-300">Rev Est</div>
            <div className="font-semibold text-sm whitespace-nowrap text-gray-900 dark:text-white">
              {formatRevenueSmart(item.revenueEstimate)}
            </div>
          </div>
          <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="text-xs text-gray-500 dark:text-gray-300">Rev Act</div>
            <div className="font-semibold text-sm whitespace-nowrap text-gray-900 dark:text-white">
              {formatRevenueSmart(item.revenueActual)}
            </div>
          </div>
          <div className="text-center p-1.5 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="text-xs text-gray-500 dark:text-gray-300">Rev Surp</div>
            <div
              className={`font-semibold text-sm ${
                item.revenueActual && item.revenueEstimate
                  ? getSurpriseColor(item.revenueActual, item.revenueEstimate)
                  : 'text-gray-900 dark:text-white'
              }`}
            >
              {item.revenueActual && item.revenueEstimate
                ? getSurpriseText(item.revenueActual, item.revenueEstimate)
                : '-'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
