'use client';

// Removed TrendingUp, TrendingDown imports - no longer using arrows
import { formatRevenueSmart } from '@/modules/shared';
import { EarningsTableRowProps } from './types';

export function EarningsTableRow({ item, index }: EarningsTableRowProps) {
  // Zebra striping - alternating row colors
  const isEven = index % 2 === 0;
  const rowBgClass = isEven 
    ? 'bg-white dark:bg-gray-900' 
    : 'bg-gray-50 dark:bg-gray-800';

  // Function to determine company size based on market cap
  const getCompanySize = (marketCap: number | null) => {
    if (!marketCap) return 'SMALL';
    const capInBillions = marketCap / 1e9;
    if (capInBillions >= 100) return 'MEGA';
    if (capInBillions >= 10) return 'LARGE';
    if (capInBillions >= 1) return 'MID';
    return 'SMALL';
  };

  // Function to get marker styles based on company size
  const getMarkerStyles = (size: string) => {
    switch (size) {
      case 'MEGA':
        return 'bg-yellow-500 border-yellow-700 text-black';
      case 'LARGE':
        return 'bg-blue-500 border-blue-700 text-white';
      case 'MID':
      case 'SMALL':
      default:
        return 'bg-white border-black text-black dark:bg-gray-800 dark:border-gray-300 dark:text-white';
    }
  };

  // Company size marker component
  const CompanySizeMarker = ({ marketCap }: { marketCap: number | null }) => {
    const size = getCompanySize(marketCap);
    const styles = getMarkerStyles(size);
    
    return (
      <div className={`px-1 py-0.5 rounded-sm border text-xs font-semibold ${styles} flex-shrink-0`} 
           title={`${size} Cap (${marketCap ? `$${(marketCap / 1e9).toFixed(1)}B` : 'N/A'})`}>
        {size}
      </div>
    );
  };
  const getSurpriseColor = (actual: number | bigint | null, estimate: number | bigint | null) => {
    // If actual is missing, show gray (dash)
    if (actual === null || actual === undefined) return 'text-gray-500';
    // If estimate is missing or zero, show gray (dash)
    if (estimate === null || estimate === undefined || estimate === 0) return 'text-gray-500';
    
    // Convert bigint to number for calculation
    const actualNum = typeof actual === 'bigint' ? Number(actual) : actual;
    const estimateNum = typeof estimate === 'bigint' ? Number(estimate) : estimate;
    
    const surprise = ((actualNum - estimateNum) / Math.abs(estimateNum)) * 100;
    if (surprise > 0) return 'text-green-600';
    if (surprise < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getSurpriseText = (actual: number | bigint | null, estimate: number | bigint | null) => {
    // If actual is missing, show dash
    if (actual === null || actual === undefined) return '—';
    // If estimate is missing or zero, show dash
    if (estimate === null || estimate === undefined || estimate === 0) return '—';
    
    // Convert bigint to number for calculation
    const actualNum = typeof actual === 'bigint' ? Number(actual) : actual;
    const estimateNum = typeof estimate === 'bigint' ? Number(estimate) : estimate;
    
    const surprise = ((actualNum - estimateNum) / Math.abs(estimateNum)) * 100;
    return `${surprise >= 0 ? '+' : ''}${Math.round(surprise)}%`;
  };

  const getPriceChangeColor = (change: number | null) => {
    if (!change) return 'text-gray-500';
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getPriceChangeIcon = (change: number | null) => {
    return null; // Removed arrows
  };

  return (
    <>
      {/* 1. Company */}
      <div className={`px-3 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors ${rowBgClass}`}>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900 dark:text-white break-words">
            {item.ticker}
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-300 break-words leading-tight">
            {item.companyName}
          </span>
        </div>
      </div>

        {/* 2. Market Cap */}
        <div className={`pl-0 pr-0 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors ${rowBgClass}`}>
          {/* Left side - Marker */}
          <div className="flex items-center">
            <CompanySizeMarker marketCap={item.marketCap} />
          </div>
          
          {/* Right side - Market Cap data */}
          <div className="flex flex-col text-right pr-0">
            <span className="text-sm font-semibold text-gray-900 dark:text-white hover:text-gray-800 dark:hover:text-gray-100 transition-colors">
              {item.marketCap !== null 
                ? formatRevenueSmart(item.marketCap)
                : '—'
              }
            </span>
            <div className={`text-xs font-medium flex items-center justify-end leading-tight ${
              item.marketCapDiffBillions !== null 
                ? item.marketCapDiffBillions >= 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              {item.marketCapDiffBillions !== null && item.marketCapDiffBillions !== undefined
                ? (
                  <>
                    <span>{item.marketCapDiffBillions >= 0 ? '+' : '−'}</span>
                    <span className="ml-0.5">{!isNaN(Number(item.marketCapDiffBillions)) ? Math.abs(Number(item.marketCapDiffBillions)).toFixed(1) : '0.0'}B</span>
                  </>
                )
                : '—'
              }
            </div>
          </div>
        </div>

      {/* 3. Price */}
      <div className={`px-3 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-end group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors ${rowBgClass}`}>
        <div className="flex items-center">
          <div className="w-6 flex justify-center">
            {getPriceChangeIcon(item.priceChangePercent)}
          </div>
          <div className="flex flex-col text-right">
            <span className="text-sm font-semibold text-gray-900 dark:text-white hover:text-gray-800 dark:hover:text-gray-100 transition-colors">
              ${item.currentPrice !== null && item.currentPrice !== undefined && !isNaN(Number(item.currentPrice)) ? Number(item.currentPrice).toFixed(2) : '—'}
            </span>
            <div className={`text-xs flex items-center justify-end leading-tight ${getPriceChangeColor(item.priceChangePercent)}`}>
              {item.priceChangePercent !== null && !isNaN(Number(item.priceChangePercent))
                ? (
                  <>
                    <span>{item.priceChangePercent >= 0 ? '+' : '−'}</span>
                    <span className="ml-0.5">{Math.abs(Number(item.priceChangePercent)).toFixed(2)}%</span>
                  </>
                )
                : '—'
              }
            </div>
          </div>
        </div>
      </div>

      {/* 4. Time */}
      <div className={`px-3 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors ${rowBgClass}`}>
        <span className="text-sm text-gray-600 dark:text-gray-300 text-center">
          {item.reportTime || 'TNS'}
        </span>
      </div>

      {/* 5. EPS */}
      <div className={`px-3 py-3 border-b border-gray-200 dark:border-gray-700 group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors ${rowBgClass}`}>
        <div className="flex flex-col text-right leading-snug">
          <span className="text-sm font-semibold text-gray-900 dark:text-white hover:text-gray-800 dark:hover:text-gray-100 transition-colors">
            {item.epsActual !== null && item.epsActual !== undefined && !isNaN(Number(item.epsActual)) ? Number(item.epsActual).toFixed(2) : '—'}
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-300">
            Est: {item.epsEstimate !== null && item.epsEstimate !== undefined && !isNaN(Number(item.epsEstimate)) ? Number(item.epsEstimate).toFixed(2) : '—'}
          </span>
            <span className={`text-xs font-medium ${getSurpriseColor(item.epsActual, item.epsEstimate)}`}>
            Surp: {getSurpriseText(item.epsActual, item.epsEstimate)}
          </span>
        </div>
      </div>

      {/* 6. Revenue */}
      <div className={`px-3 py-3 border-b border-gray-200 dark:border-gray-700 group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors ${rowBgClass}`}>
        <div className="flex flex-col text-right leading-snug">
          <span className="text-sm font-semibold text-gray-900 dark:text-white hover:text-gray-800 dark:hover:text-gray-100 transition-colors">
            {item.revenueActual !== null 
              ? formatRevenueSmart(Number(item.revenueActual))
              : '—'
            }
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-300">
            Est: {item.revenueEstimate !== null 
              ? formatRevenueSmart(Number(item.revenueEstimate))
              : '—'
            }
          </span>
          <span className={`text-xs font-medium ${getSurpriseColor(item.revenueActual, item.revenueEstimate)}`}>
            Surp: {getSurpriseText(item.revenueActual, item.revenueEstimate)}
          </span>
        </div>
      </div>
    </>
  );
}
