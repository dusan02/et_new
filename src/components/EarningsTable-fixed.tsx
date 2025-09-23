'use client';

import { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from './ui/LoadingSpinner';
// 🚫 GUIDANCE DISABLED FOR PRODUCTION - Import commented out
// import { formatGuidePercent, getGuidanceTitle } from '@/utils/format';
import { trackTableSort, trackTableFilter, trackViewToggle, trackRefresh } from './Analytics';
import { useVirtualizer } from '@tanstack/react-virtual';

interface EarningsData {
  ticker: string;
  reportTime: string | null;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: string | null; // BigInt serialized as string
  revenueActual: string | null; // BigInt serialized as string
  sector: string | null;
  companyType: string | null;
  dataSource: string | null;
  fiscalPeriod: string | null;
  fiscalYear: number | null;
  primaryExchange: string | null;
  // Market data from Polygon
  companyName: string;
  size: string | null;
  marketCap: string | null; // BigInt serialized as string
  marketCapDiff: string | null; // BigInt serialized as string
  marketCapDiffBillions: number | null;
  currentPrice: number | null;
  previousClose: number | null;
  priceChangePercent: number | null;
  sharesOutstanding: string | null; // BigInt serialized as string
  // Guidance calculations
  epsGuideSurprise: number | null;
  epsGuideBasis: string | null;
  epsGuideExtreme: boolean;
  revenueGuideSurprise: number | null;
  revenueGuideBasis: string | null;
  revenueGuideExtreme: boolean;
  // Raw guidance data for debugging
  guidanceData: {
    estimatedEpsGuidance: number | null;
    estimatedRevenueGuidance: string | null;
    epsGuideVsConsensusPct: number | null;
    revenueGuideVsConsensusPct: number | null;
    notes: string | null;
    lastUpdated: string | null;
    fiscalPeriod: string | null;
    fiscalYear: number | null;
  } | null;
  // Surprise calculations
  epsSurprise: number | null;
  revenueSurprise: number | null;
}

interface EarningsTableProps {
  data: EarningsData[];
  isLoading: boolean;
  onRefresh: () => void;
}

// Custom hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export const EarningsTable = memo(({ data, isLoading, onRefresh }: EarningsTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('market_cap');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [activeView, setActiveView] = useState<'eps-revenue' | 'guidance'>('eps-revenue');
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string | null>('market_cap');
  
  // Debounced search term for performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  
  // Memoized callbacks for performance
  const handleColumnClick = useCallback((field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setSelectedColumn(field);
    trackTableSort(field, sortField === field ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'desc');
  }, [sortField, sortDirection]);
  
  const handleColumnHover = useCallback((field: string | null) => {
    setHoveredColumn(field);
  }, []);

  // Helper functions
  const formatCurrency = (value: string | bigint | null) => {
    if (!value) return '-';
    const num = typeof value === 'string' ? Number(value) : Number(value);
    
    if (num >= 1e12) {
      return `${(num / 1e12).toFixed(1)}T`;
    } else if (num >= 1e9) {
      return `${(num / 1e9).toFixed(1)}B`;
    } else if (num >= 1e6) {
      return `${(num / 1e6).toFixed(1)}M`;
    } else if (num >= 1e3) {
      return `${(num / 1e3).toFixed(1)}K`;
    }
    return num.toFixed(0);
  };

  const formatMarketCap = (value: string | bigint | null) => {
    if (!value) return '-';
    const num = typeof value === 'string' ? Number(value) : Number(value);
    
    if (num >= 1e12) {
      return `$${(num / 1e12).toFixed(1)}T`;
    } else if (num >= 1e9) {
      return `$${(num / 1e9).toFixed(1)}B`;
    } else if (num >= 1e6) {
      return `$${(num / 1e6).toFixed(1)}M`;
    } else if (num >= 1e3) {
      return `$${(num / 1e3).toFixed(1)}K`;
    }
    return `$${num.toFixed(0)}`;
  };

  const formatBillions = (value: number | null) => {
    if (value === null) return '-';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}B`;
  };

  const formatPercentage = (value: number | null) => {
    if (value === null) return '-';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatEPS = (value: number | null) => {
    if (value === null) return '-';
    return `$${value.toFixed(2)}`;
  };

  const formatRevenue = (value: string | null) => {
    if (!value) return '-';
    return formatCurrency(value);
  };

  const formatSurprise = (value: number | null) => {
    if (value === null) return '-';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getPriceChangeClass = (value: number | null) => {
    if (value === null) return 'text-gray-500';
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getDiffClass = (value: bigint | null) => {
    if (value === null) return 'text-gray-500';
    return value >= BigInt(0) ? 'text-green-600' : 'text-red-600';
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = data.filter(item => 
        item.ticker.toLowerCase().includes(searchLower) ||
        item.companyName.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      let aValue: any = a[sortField as keyof EarningsData];
      let bValue: any = b[sortField as keyof EarningsData];

      // Handle BigInt values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        try {
          aValue = BigInt(aValue);
          bValue = BigInt(bValue);
        } catch {
          // Keep as string if not valid BigInt
        }
      }

      // Handle null values
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return sortDirection === 'asc' ? -1 : 1;
      if (bValue === null) return sortDirection === 'asc' ? 1 : -1;

      // Compare values
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, debouncedSearchTerm, sortField, sortDirection]);

  const sortedData = filteredAndSortedData;

  return (
    <div>
      {/* Header - Outside of table container */}
      <div className="py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Today's Earnings</h2>
            {data.length === 0 ? (
              <p className="text-sm text-gray-600 mt-1">
                No companies reporting earnings today
              </p>
            ) : (
              <p className="text-sm text-gray-600 mt-1">
                {data.length} companies reporting earnings today - includes actual EPS and Revenues reporting
              </p>
            )}
          </div>
        </div>
        
        <div className="mt-4">
          <input
            type="text"
            placeholder="Search tickers, companies..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (e.target.value.length > 0) {
                trackTableFilter('search', e.target.value);
              }
            }}
            className="w-full sm:w-80 px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white placeholder-gray-500 shadow-sm"
          />
          
          {/* 🚫 GUIDANCE DISABLED FOR PRODUCTION - View Toggle Buttons commented out */}
          {/* 
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => {
                setActiveView('eps-revenue');
                trackViewToggle('eps_revenue');
              }}
              className={`px-4 py-2 rounded-md font-medium transition-all ${
                activeView === 'eps-revenue' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              EPS & Revenue
            </button>
            <button
              onClick={() => {
                setActiveView('guidance');
                trackViewToggle('guidance');
              }}
              className={`px-4 py-2 rounded-md font-medium transition-all ${
                activeView === 'guidance' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Guidance
            </button>
          </div>
          */}
        </div>
      </div>

      {/* Table Container with Sticky Columns */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-300">
        {/* Table Structure - Single Table with Sticky Columns */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-max" aria-label="Earnings table">
            <caption className="sr-only">Company earnings data with market information</caption>
            <colgroup>
              {/* Sticky columns - fixed width */}
              <col style={{ width: '50px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '120px' }} />
              {/* Scrollable columns */}
              <col style={{ width: '60px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '70px' }} />
            </colgroup>
            <thead className="bg-blue-100 border-b border-gray-300">
              <tr>
                {/* Sticky columns */}
                <th 
                  className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-3 sticky left-0 bg-blue-100 z-10 border-r border-gray-200" 
                  scope="col"
                >
                  #
                </th>
                <th 
                  className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-3 sticky left-[50px] bg-blue-100 z-10 border-r border-gray-200" 
                  scope="col"
                >
                  Ticker
                </th>
                <th 
                  className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-3 sticky left-[120px] bg-blue-100 z-10 border-r border-gray-200" 
                  scope="col"
                >
                  Company
                </th>
                {/* Scrollable columns */}
                <th 
                  className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-3" 
                  scope="col"
                >
                  Size
                </th>
                <th 
                  className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-3" 
                  scope="col"
                >
                  Market Cap
                </th>
                <th 
                  className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-3" 
                  scope="col"
                >
                  Cap Diff
                </th>
                <th 
                  className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-3" 
                  scope="col"
                >
                  Price
                </th>
                <th 
                  className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-3" 
                  scope="col"
                >
                  Change
                </th>
                <th 
                  className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-3" 
                  scope="col"
                >
                  EPS Est
                </th>
                <th 
                  className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-3" 
                  scope="col"
                >
                  EPS Act
                </th>
                <th 
                  className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-3" 
                  scope="col"
                >
                  EPS Surp
                </th>
                <th 
                  className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-3" 
                  scope="col"
                >
                  Rev Est
                </th>
                <th 
                  className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-3" 
                  scope="col"
                >
                  Rev Act
                </th>
                <th 
                  className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-3" 
                  scope="col"
                >
                  Rev Surp
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center">
                    <LoadingSpinner size="md" />
                  </td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-gray-500">
                    {data.length === 0 ? (
                      <div className="flex flex-col items-center space-y-4">
                        <div className="relative">
                          <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                        <div className="text-xl font-semibold text-gray-700">No Earnings Scheduled</div>
                        <div className="text-sm text-gray-500 text-center max-w-md">
                          There are no earnings reports scheduled for today.<br />
                          Check back tomorrow for new earnings data.
                        </div>
                      </div>
                    ) : (
                      "No results found for your search"
                    )}
                  </td>
                </tr>
              ) : (
                sortedData.map((item, index) => (
                  <tr key={item.ticker} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    {/* Sticky columns */}
                    <td className="px-2 py-3 text-sm text-gray-900 sticky left-0 bg-inherit z-10 border-r border-gray-200">
                      {index + 1}
                    </td>
                    <td className="px-2 py-3 text-sm font-medium text-gray-900 sticky left-[50px] bg-inherit z-10 border-r border-gray-200">
                      {item.ticker}
                    </td>
                    <td className="px-2 py-3 text-sm text-gray-900 sticky left-[120px] bg-inherit z-10 border-r border-gray-200 truncate" title={item.companyName || item.ticker}>
                      {item.companyName ? 
                        (item.companyName.length > 12 ? `${item.companyName.substring(0, 12)}...` : item.companyName) 
                        : item.ticker}
                    </td>
                    {/* Scrollable columns */}
                    <td className="px-2 py-3 text-sm text-gray-600">
                      {item.size || '-'}
                    </td>
                    <td className="px-2 py-3 text-sm text-gray-900 text-right">
                      {item.marketCap ? formatMarketCap(item.marketCap) : '-'}
                    </td>
                    <td className={`px-2 py-3 text-sm text-right ${getDiffClass(item.marketCapDiffBillions ? BigInt(Math.round(item.marketCapDiffBillions * 1e9)) : null)}`}>
                      {item.marketCapDiffBillions ? formatBillions(item.marketCapDiffBillions) : '-'}
                    </td>
                    <td className="px-2 py-3 text-sm text-gray-900 text-right">
                      {item.currentPrice ? `$${item.currentPrice.toFixed(2)}` : '-'}
                    </td>
                    <td className={`px-2 py-3 text-sm text-right ${getPriceChangeClass(item.priceChangePercent)}`}>
                      {item.priceChangePercent ? formatPercentage(item.priceChangePercent) : '-'}
                    </td>
                    <td className="px-2 py-3 text-sm text-gray-600 text-right">
                      {formatEPS(item.epsEstimate)}
                    </td>
                    <td className="px-2 py-3 text-sm text-gray-900 text-right">
                      {formatEPS(item.epsActual)}
                    </td>
                    <td className="px-2 py-3 text-sm text-right">
                      {formatSurprise(item.epsSurprise)}
                    </td>
                    <td className="px-2 py-3 text-sm text-gray-600 text-right">
                      {formatRevenue(item.revenueEstimate)}
                    </td>
                    <td className="px-2 py-3 text-sm text-gray-900 text-right">
                      {formatRevenue(item.revenueActual)}
                    </td>
                    <td className="px-2 py-3 text-sm text-right">
                      {formatSurprise(item.revenueSurprise)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
