'use client';

import React from 'react';
import { SkeletonLoader, SkeletonCard } from '../ui/SkeletonLoader';
import { MobileCard } from './MobileCard';
import { EarningsTableRow } from './EarningsTableRow';
import { EarningsTableBodyProps } from './types';

export function EarningsTableBody({ 
  data, 
  isLoading, 
  error, 
  sortColumn, 
  sortDirection, 
  onSort 
}: EarningsTableBodyProps) {
  const getHeaderClasses = (column: string) => {
    // Determine text alignment based on column
    const getTextAlign = (col: string) => {
      switch (col) {
        case 'marketCap':
        case 'price':
        case 'eps':
        case 'revenue':
          return 'text-right';
        case 'company':
        case 'time':
        default:
          return 'text-center';
      }
    };
    
    // Determine padding based on column
    const getPadding = (col: string) => {
      switch (col) {
        case 'price':
        case 'eps':
        case 'revenue':
          return 'px-3'; // Reduced padding for compact columns
        case 'time':
          return 'px-2'; // Minimal padding for TIME column to center properly
        default:
          return 'px-6'; // Standard padding for other columns
      }
    };
    
    const baseClasses = `${getPadding(column)} py-3 ${getTextAlign(column)} text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors duration-200`;
    const isActive = sortColumn === column;
    
    if (isActive) {
      return `${baseClasses} bg-blue-400 text-white hover:bg-blue-500`;
    }
    
    return `${baseClasses} bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800`;
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return null;
    
    return sortDirection === 'asc' ? (
      <span className="ml-1">↑</span>
    ) : (
      <span className="ml-1">↓</span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Desktop skeleton */}
        <div className="hidden md:block">
          <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 dark:ring-1 dark:ring-white dark:ring-opacity-20 md:rounded-lg w-full">
            <div className="flex justify-center">
              <div className="grid grid-cols-[3fr_2fr_1fr_1fr_1fr_1.2fr] w-full max-w-[1100px] mx-auto">
              {/* Header Row */}
              <div className="px-3 py-3 text-center text-xs font-medium text-blue-800 bg-blue-100 dark:bg-blue-900 dark:text-blue-200 uppercase tracking-wider">
                Company
              </div>
              <div className="px-3 py-3 text-right text-xs font-medium text-blue-800 bg-blue-100 dark:bg-blue-900 dark:text-blue-200 uppercase tracking-wider">
                Market Cap
              </div>
              <div className="px-3 py-3 text-right text-xs font-medium text-blue-800 bg-blue-100 dark:bg-blue-900 dark:text-blue-200 uppercase tracking-wider">
                Price
              </div>
              <div className="px-3 py-3 text-center text-xs font-medium text-blue-800 bg-blue-100 dark:bg-blue-900 dark:text-blue-200 uppercase tracking-wider">
                Time
              </div>
              <div className="px-3 py-3 text-right text-xs font-medium text-blue-800 bg-blue-100 dark:bg-blue-900 dark:text-blue-200 uppercase tracking-wider">
                EPS
              </div>
              <div className="px-3 py-3 text-right text-xs font-medium text-blue-800 bg-blue-100 dark:bg-blue-900 dark:text-blue-200 uppercase tracking-wider">
                Revenue
              </div>
              
              {/* Skeleton Rows */}
              {Array.from({ length: 5 }).map((_, index) => {
                const isEven = index % 2 === 0;
                const rowBgClass = isEven 
                  ? 'bg-white dark:bg-gray-900' 
                  : 'bg-gray-50 dark:bg-gray-800';
                
                return (
                  <React.Fragment key={`skeleton-row-${index}`}>
                    <div className={`px-3 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center ${rowBgClass}`}>
                      <div className="space-y-1">
                        <SkeletonLoader className="h-4 w-16" />
                        <SkeletonLoader className="h-3 w-20" />
                      </div>
                    </div>
                    <div className={`px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center ${rowBgClass}`}>
                      <SkeletonLoader className="h-4 w-12" />
                    </div>
                    <div className={`px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center ${rowBgClass}`}>
                      <SkeletonLoader className="h-4 w-16" />
                    </div>
                    <div className={`px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center ${rowBgClass}`}>
                      <SkeletonLoader className="h-4 w-14" />
                    </div>
                    <div className={`px-6 py-3 border-b border-gray-200 dark:border-gray-700 ${rowBgClass}`}>
                      <SkeletonLoader className="h-4 w-18" />
                    </div>
                    <div className={`px-6 py-3 border-b border-gray-200 dark:border-gray-700 ${rowBgClass}`}>
                      <SkeletonLoader className="h-4 w-16" />
                    </div>
                  </React.Fragment>
                );
              })}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile skeleton */}
        <div className="md:hidden space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonLoader key={index} type="card" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 dark:text-red-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Error loading data
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {error}
        </p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 dark:text-gray-500 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Earnings Scheduled
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          There are no earnings reports scheduled for today. Check back tomorrow for new earnings data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 dark:ring-1 dark:ring-white dark:ring-opacity-20 md:rounded-lg w-full">
          <div className="flex justify-center">
            <div className="grid grid-cols-[3fr_2fr_1fr_1fr_1fr_1.2fr] w-full max-w-[1100px] mx-auto">
            {/* Header Row */}
            <div 
              className={getHeaderClasses('company')}
              onClick={() => onSort?.('company')}
            >
              Company{getSortIcon('company')}
            </div>
            <div 
              className={getHeaderClasses('marketCap')}
              onClick={() => onSort?.('marketCap')}
            >
              Market Cap{getSortIcon('marketCap')}
            </div>
            <div 
              className={getHeaderClasses('price')}
              onClick={() => onSort?.('price')}
            >
              Price{getSortIcon('price')}
            </div>
            <div 
              className={getHeaderClasses('time')}
              onClick={() => onSort?.('time')}
            >
              Time{getSortIcon('time')}
            </div>
            <div 
              className={getHeaderClasses('eps')}
              onClick={() => onSort?.('eps')}
            >
              EPS{getSortIcon('eps')}
            </div>
            <div 
              className={getHeaderClasses('revenue')}
              onClick={() => onSort?.('revenue')}
            >
              Revenue{getSortIcon('revenue')}
            </div>
            
            {/* Data Rows */}
            {data.map((item, index) => (
              <div key={`${item.ticker}-${index}`} className="contents group">
                <EarningsTableRow item={item} index={index} />
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {data.map((item, index) => (
          <MobileCard key={`${item.ticker}-${index}`} item={item} index={index} />
        ))}
      </div>
    </div>
  );
}
