'use client';

import { useState, useMemo, useEffect } from 'react';
import { EarningsTableHeader } from './EarningsTableHeader';
import { EarningsTableBody } from './EarningsTableBody';
import { EarningsTableProps } from './types';

export function EarningsTableRefactored({
  data,
  stats,
  isLoading,
  error,
  lastUpdated
}: EarningsTableProps) {
  const [sortColumn, setSortColumn] = useState<string>('marketCap');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [marketCapFilters, setMarketCapFilters] = useState<string[]>([]);
  
  // Prevent hydration mismatch by ensuring consistent initial state
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Calculate available market cap sizes from actual data
  const availableMarketCapSizes = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const sizes = new Set<string>();
    
    data.forEach(item => {
      // Calculate size from marketCap if size property is missing
      let itemSize = item.size;
      if (!itemSize && item.marketCap) {
        const marketCapValue = Number(item.marketCap);
        if (marketCapValue > 100_000_000_000) itemSize = 'MEGA';
        else if (marketCapValue >= 10_000_000_000) itemSize = 'LARGE';
        else if (marketCapValue >= 2_000_000_000) itemSize = 'MID';
        else itemSize = 'SMALL';
      }
      
      if (itemSize) {
        // Convert to uppercase to match filter format
        sizes.add(itemSize.toUpperCase());
      }
    });
    
    return Array.from(sizes).sort();
  }, [data]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return data;

    // Filter data based on search term
    let filteredData = data;
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filteredData = data.filter(item => 
        item.ticker.toLowerCase().includes(searchLower) ||
        (item.companyName && item.companyName.toLowerCase().includes(searchLower))
      );
    }

    // Filter data based on market cap filters
    if (marketCapFilters.length > 0 && !marketCapFilters.includes('All')) {
      filteredData = filteredData.filter(item => {
        // Calculate size from marketCap if size property is missing
        let itemSize = item.size;
        if (!itemSize && item.marketCap) {
          const marketCapValue = Number(item.marketCap);
          if (marketCapValue > 100_000_000_000) itemSize = 'Mega';
          else if (marketCapValue >= 10_000_000_000) itemSize = 'Large';
          else if (marketCapValue >= 2_000_000_000) itemSize = 'Mid';
          else itemSize = 'Small';
        }
        
        if (!itemSize) return false;
        
        // Convert filter values to match data format (MEGA -> Mega, etc.)
        const normalizedFilters = marketCapFilters.map(filter => {
          if (filter === 'MEGA') return 'Mega';
          if (filter === 'LARGE') return 'Large';
          if (filter === 'MID') return 'Mid';
          if (filter === 'SMALL') return 'Small';
          return filter;
        });
        
        return normalizedFilters.includes(itemSize);
      });
    }

    // Helper function to check if value is null/undefined/empty
    const isNullValue = (value: any) => {
      return value === null || value === undefined || value === '' || value === 0;
    };

    // Helper function to get numeric value or null
    const getNumericValue = (value: any) => {
      if (isNullValue(value)) return null;
      const num = Number(value);
      return isNaN(num) ? null : num;
    };

    return [...filteredData].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'company':
          aValue = a.ticker.toLowerCase();
          bValue = b.ticker.toLowerCase();
          break;
        case 'marketCap':
          aValue = getNumericValue(a.marketCap);
          bValue = getNumericValue(b.marketCap);
          break;
        case 'price':
          aValue = getNumericValue(a.currentPrice);
          bValue = getNumericValue(b.currentPrice);
          break;
        case 'time':
          aValue = a.reportTime || '';
          bValue = b.reportTime || '';
          break;
        case 'eps':
          // Sort by EPS estimate (ignore null values)
          aValue = getNumericValue(a.epsEstimate);
          bValue = getNumericValue(b.epsEstimate);
          break;
        case 'revenue':
          // Sort by Revenue estimate (ignore null values)
          aValue = getNumericValue(a.revenueEstimate);
          bValue = getNumericValue(b.revenueEstimate);
          break;
        default:
          return 0;
      }

      // Handle null values - put them at the end
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1; // null values go to end
      if (bValue === null) return -1; // null values go to end

      // Normal comparison for non-null values
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortColumn, sortDirection, searchTerm, marketCapFilters]);

  // Show loading state on server and until client hydration
  if (!isClient) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EarningsTableHeader 
        lastUpdated={lastUpdated}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        marketCapFilters={marketCapFilters}
        onMarketCapFilterChange={setMarketCapFilters}
        availableMarketCapSizes={availableMarketCapSizes}
      />
      
      <EarningsTableBody 
        data={sortedData}
        isLoading={isLoading}
        error={error}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
      />
    </div>
  );
}