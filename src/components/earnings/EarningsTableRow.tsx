'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatRevenueSmart } from '@/modules/shared';
import { EarningsTableRowProps } from './types';

export function EarningsTableRow({ item, index }: EarningsTableRowProps) {
  // Zebra striping - alternating row colors
  const isEven = index % 2 === 0;
  const rowBgClass = isEven 
    ? 'bg-white dark:bg-gray-900' 
    : 'bg-gray-50 dark:bg-gray-800';
  const getSurpriseColor = (actual: number | null, estimate: number | null) => {
    if (!actual || !estimate) return 'text-gray-500';
    const surprise = ((actual - estimate) / Math.abs(estimate)) * 100;
    if (surprise > 5) return 'text-green-600';
    if (surprise < -5) return 'text-red-600';
    return 'text-gray-600';
  };

  const getSurpriseText = (actual: number | null, estimate: number | null) => {
    if (!actual || !estimate || estimate === 0) return '—';
    const surprise = ((actual - estimate) / Math.abs(estimate)) * 100;
    return `${surprise >= 0 ? '+' : ''}${Math.round(surprise)}%`;
  };

  const getPriceChangeColor = (change: number | null) => {
    if (!change) return 'text-gray-500';
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getPriceChangeIcon = (change: number | null) => {
    if (!change) return null;
    return change >= 0 ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  return (
    <>
      {/* 1. Company - 3 columns */}
      <div className={`col-span-3 px-3 py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center ${rowBgClass}`}>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900 dark:text-white break-words">
            {item.ticker}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 break-words leading-tight">
            {item.companyName}
          </span>
        </div>
      </div>

      {/* 2. Market Cap - 2 columns */}
      <div className={`col-span-2 px-6 py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-end ${rowBgClass}`}>
        <div className="flex flex-col text-right">
          <span className="text-sm text-gray-900 dark:text-white">
            {item.marketCap !== null 
              ? formatRevenueSmart(item.marketCap)
              : '—'
            }
          </span>
          <span className={`text-xs font-medium ${
            item.marketCapDiffBillions !== null 
              ? item.marketCapDiffBillions >= 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            {item.marketCapDiffBillions !== null && item.marketCapDiffBillions !== undefined
              ? `${item.marketCapDiffBillions >= 0 ? '+' : ''}${!isNaN(Number(item.marketCapDiffBillions)) ? Number(item.marketCapDiffBillions).toFixed(1) : '0.0'}B`
              : '—'
            }
          </span>
        </div>
      </div>

      {/* 3. Price - 2 columns */}
      <div className={`col-span-2 px-6 py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-end ${rowBgClass}`}>
        <div className="flex items-center">
          <div className="w-6 flex justify-center">
            {getPriceChangeIcon(item.priceChangePercent)}
          </div>
          <div className="flex flex-col text-right">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              ${item.currentPrice !== null && item.currentPrice !== undefined && !isNaN(Number(item.currentPrice)) ? Number(item.currentPrice).toFixed(2) : '—'}
            </span>
            <span className={`text-xs ${getPriceChangeColor(item.priceChangePercent)}`}>
              {item.priceChangePercent !== null && !isNaN(Number(item.priceChangePercent))
                ? `${item.priceChangePercent >= 0 ? '+' : ''}${Number(item.priceChangePercent).toFixed(2)}%`
                : '—'
              }
            </span>
          </div>
        </div>
      </div>

      {/* 4. Time - 1 column */}
      <div className={`col-span-1 px-6 py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center ${rowBgClass}`}>
        <span className="text-sm text-gray-900 dark:text-white">
          {item.reportTime || 'TNS'}
        </span>
      </div>

      {/* 5. EPS - 2 columns */}
      <div className={`col-span-2 px-6 py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${rowBgClass}`}>
        <div className="flex flex-col text-right">
          <span className="text-sm text-gray-900 dark:text-white">
            {item.epsActual !== null && item.epsActual !== undefined && !isNaN(Number(item.epsActual)) ? Number(item.epsActual).toFixed(2) : '—'}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Est: {item.epsEstimate !== null && item.epsEstimate !== undefined && !isNaN(Number(item.epsEstimate)) ? Number(item.epsEstimate).toFixed(2) : '—'}
          </span>
            <span className={`text-xs font-medium ${getSurpriseColor(item.epsActual, item.epsEstimate)}`}>
            Surp: {getSurpriseText(item.epsActual, item.epsEstimate)}
          </span>
        </div>
      </div>

      {/* 6. Revenue - 2 columns */}
      <div className={`col-span-2 px-6 py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${rowBgClass}`}>
        <div className="flex flex-col text-right">
          <span className="text-sm text-gray-900 dark:text-white">
            {item.revenueActual !== null 
              ? formatRevenueSmart(Number(item.revenueActual))
              : '—'
            }
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Est: {item.revenueEstimate !== null 
              ? formatRevenueSmart(Number(item.revenueEstimate))
              : '—'
            }
          </span>
          <span className={`text-xs font-medium ${getSurpriseColor(Number(item.revenueActual), Number(item.revenueEstimate))}`}>
            Surp: {getSurpriseText(Number(item.revenueActual), Number(item.revenueEstimate))}
          </span>
        </div>
      </div>
    </>
  );
}
