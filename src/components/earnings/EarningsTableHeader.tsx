'use client';

import { useState, useEffect, useRef } from 'react';
import { EarningsTableHeaderProps } from './types';

export function EarningsTableHeader({ 
  lastUpdated,
  searchTerm,
  onSearchChange,
  marketCapFilters = [],
  onMarketCapFilterChange,
  availableMarketCapSizes = []
}: EarningsTableHeaderProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Generate market cap options based on available data
  const marketCapOptions = [
    { value: 'All', label: 'All' },
    ...availableMarketCapSizes.map(size => ({
      value: size,
      label: size.charAt(0) + size.slice(1).toLowerCase() // Convert MEGA -> Mega, etc.
    }))
  ];

  const handleFilterChange = (value: string) => {
    if (!onMarketCapFilterChange) return;

    let newFilters: string[];
    
    if (value === 'All') {
      // If All is clicked, toggle all available filters
      if (marketCapFilters.includes('All')) {
        newFilters = [];
      } else {
        newFilters = ['All', ...availableMarketCapSizes];
      }
    } else {
      // Toggle individual filter
      if (marketCapFilters.includes(value)) {
        newFilters = marketCapFilters.filter(f => f !== value && f !== 'All');
      } else {
        newFilters = [...marketCapFilters.filter(f => f !== 'All'), value];
      }
      
      // If all individual filters are selected, add 'All'
      if (newFilters.length === availableMarketCapSizes.length && !newFilters.includes('All')) {
        newFilters = ['All', ...availableMarketCapSizes];
      }
    }
    
    onMarketCapFilterChange(newFilters);
  };

  const getFilterDisplayText = () => {
    if (marketCapFilters.length === 0) return 'All';
    if (marketCapFilters.includes('All')) return 'All';
    if (marketCapFilters.length === 1) return marketCapOptions.find(opt => opt.value === marketCapFilters[0])?.label || 'All';
    return `${marketCapFilters.length} selected`;
  };
  return (
    <div className="w-full px-4 mb-3">
      <div className="flex flex-col md:flex-row justify-between items-center w-full">
        
        {/* Earnings Dashboard Text - Left Side */}
        <div className="flex flex-col text-left w-full md:w-1/2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-800 via-blue-700 to-indigo-700 dark:from-gray-200 dark:via-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2 sm:mb-3 tracking-tight">
            EARNINGS DASHBOARD
          </h1>
          {lastUpdated && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* Search Bar and Filter - Right Side */}
        <div className="w-full md:w-1/2 md:flex md:justify-end mt-3 md:mt-0">
          <div className="flex gap-2 w-full md:w-auto">
            {/* Search Bar */}
            <div className="relative flex-1 md:w-72">
              <input
                type="text"
                placeholder="Search ticker or company name..."
                value={searchTerm || ''}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full px-3 py-2 pl-9 border border-gray-300 dark:border-gray-600 rounded-md 
                           focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 
                           text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 h-9"
              />
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <svg
                  className="h-4 w-4 text-gray-400"
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

            {/* Market Cap Filter Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center gap-1.5 px-2.5 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600
                           focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-colors h-9"
              >
                <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="text-sm">{getFilterDisplayText()}</span>
                <svg className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isFilterOpen && (
                <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-10">
                  <div className="py-1">
                    {marketCapOptions.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={marketCapFilters.includes(option.value)}
                          onChange={() => handleFilterChange(option.value)}
                          className="w-3.5 h-3.5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 
                                     dark:focus:ring-blue-600 dark:ring-offset-gray-700 focus:ring-1 dark:bg-gray-600 dark:border-gray-500"
                        />
                        <span className="text-sm text-gray-900 dark:text-white">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
