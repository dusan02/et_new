/**
 * 🔧 EARNINGS UTILITIES
 * Utility funkcie pre earnings komponenty
 */

import { EarningsData, SortConfig, FilterConfig } from './types';

/**
 * Formátuje číslo na percentá
 */
export function formatPercent(value: number | null, decimals: number = 2): string {
  if (value === null || value === undefined) return 'N/A';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formátuje číslo na miliardy
 */
export function formatBillions(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  return `$${(value / 1_000_000_000).toFixed(1)}B`;
}

/**
 * Formátuje cenu
 */
export function formatPrice(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  return `$${value.toFixed(2)}`;
}

/**
 * Formátuje market cap
 */
export function formatMarketCap(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  
  const billions = value / 1_000_000_000;
  if (billions >= 1000) {
    return `$${(billions / 1000).toFixed(1)}T`;
  } else if (billions >= 1) {
    return `$${billions.toFixed(1)}B`;
  } else {
    const millions = value / 1_000_000;
    return `$${millions.toFixed(0)}M`;
  }
}

/**
 * Formátuje market cap diff
 */
export function formatMarketCapDiff(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  
  const billions = value / 1_000_000_000;
  if (Math.abs(billions) >= 1) {
    return `$${billions.toFixed(1)}B`;
  } else {
    const millions = value / 1_000_000;
    return `$${millions.toFixed(0)}M`;
  }
}

/**
 * Získa farbu pre percentuálnu zmenu
 */
export function getChangeColor(value: number | null): string {
  if (value === null || value === undefined) return 'text-gray-500';
  if (value > 0) return 'text-green-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-500';
}

/**
 * Získa farbu pre surprise
 */
export function getSurpriseColor(value: number | null): string {
  if (value === null || value === undefined) return 'text-gray-500';
  if (value > 0) return 'text-green-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-500';
}

/**
 * Získa ikonu pre sortovanie
 */
export function getSortIcon(field: string, sortConfig: SortConfig) {
  if (sortConfig.field !== field) {
    return '↕️';
  }
  return sortConfig.direction === 'asc' ? '↑' : '↓';
}

/**
 * Filtruje data podľa konfigurácie
 */
export function filterData(data: EarningsData[], filterConfig: FilterConfig): EarningsData[] {
  return data.filter(item => {
    // Search filter
    if (filterConfig.searchTerm) {
      const searchLower = filterConfig.searchTerm.toLowerCase();
      const matchesSearch = 
        item.ticker.toLowerCase().includes(searchLower) ||
        item.companyName.toLowerCase().includes(searchLower) ||
        (item.sector && item.sector.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;
    }

    // Show only with actual filter
    if (filterConfig.showOnlyWithActual) {
      if (!item.epsActual || !item.revenueActual) return false;
    }

    // Size filter
    if (filterConfig.sizeFilter && item.size !== filterConfig.sizeFilter) {
      return false;
    }

    // Sector filter
    if (filterConfig.sectorFilter && item.sector !== filterConfig.sectorFilter) {
      return false;
    }

    return true;
  });
}

/**
 * Sortuje data podľa konfigurácie
 */
export function sortData(data: EarningsData[], sortConfig: SortConfig): EarningsData[] {
  if (!sortConfig.field) return data;

  return [...data].sort((a, b) => {
    const aValue = getNestedValue(a, sortConfig.field!);
    const bValue = getNestedValue(b, sortConfig.field!);

    // Handle null values
    if (aValue === null && bValue === null) return 0;
    if (aValue === null) return 1;
    if (bValue === null) return -1;

    // Compare values
    let comparison = 0;
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue);
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    }

    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });
}

/**
 * Získa hodnotu z nested objektu
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Vypočíta EPS surprise
 */
export function calculateEpsSurprise(actual: number | null, estimate: number | null): number | null {
  if (actual === null || estimate === null || estimate === 0) return null;
  return ((actual - estimate) / Math.abs(estimate)) * 100;
}

/**
 * Vypočíta Revenue surprise
 */
export function calculateRevenueSurprise(actual: number | null, estimate: number | null): number | null {
  if (actual === null || estimate === null || estimate === 0) return null;
  return ((actual - estimate) / Math.abs(estimate)) * 100;
}

/**
 * Získa unikátne sektory z dát
 */
export function getUniqueSectors(data: EarningsData[]): string[] {
  const sectors = data
    .map(item => item.sector)
    .filter((sector): sector is string => sector !== null && sector !== '');
  
  return Array.from(new Set(sectors)).sort();
}

/**
 * Získa unikátne veľkosti z dát
 */
export function getUniqueSizes(data: EarningsData[]): string[] {
  const sizes = data
    .map(item => item.size)
    .filter((size): size is string => size !== null && size !== '');
  
  return Array.from(new Set(sizes)).sort();
}

/**
 * Získa report time label
 */
export function getReportTimeLabel(reportTime: string | null): string {
  if (!reportTime) return 'TNS';
  
  const timeMap: Record<string, string> = {
    'BMO': 'Before Market Open',
    'AMC': 'After Market Close',
    'TNS': 'Time Not Specified'
  };
  
  return timeMap[reportTime] || reportTime;
}

/**
 * Získa report time color
 */
export function getReportTimeColor(reportTime: string | null): string {
  if (!reportTime) return 'bg-gray-100 text-gray-800';
  
  const colorMap: Record<string, string> = {
    'BMO': 'bg-blue-100 text-blue-800',
    'AMC': 'bg-purple-100 text-purple-800',
    'TNS': 'bg-gray-100 text-gray-800'
  };
  
  return colorMap[reportTime] || 'bg-gray-100 text-gray-800';
}
