'use client';

import { EarningsTableHeaderProps } from './types';

export function EarningsTableHeader({ 
  lastUpdated,
  searchTerm,
  onSearchChange
}: EarningsTableHeaderProps) {
  return (
    <div className="container mx-auto px-4 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-center w-full">
        
        {/* Earnings Dashboard Text - Left Side */}
        <div className="flex flex-col text-left w-full md:w-1/2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Earnings Dashboard
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Real-time earnings data and market movements
          </p>
          {lastUpdated && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* Search Bar - Right Side */}
        <div className="w-full md:w-1/2 md:flex md:justify-end mt-4 md:mt-0">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search ticker or company name..."
              value={searchTerm || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg 
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 
                         text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
