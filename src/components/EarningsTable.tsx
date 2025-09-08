'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { formatGuidePercent, getGuidanceTitle } from '@/utils/format';
import { trackTableSort, trackTableFilter, trackViewToggle, trackRefresh } from './Analytics';

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
    lastUpdated: string | null;
  } | null;
}

interface EarningsTableProps {
  data: EarningsData[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function EarningsTable({ data, isLoading, onRefresh }: EarningsTableProps) {
  const [sortField, setSortField] = useState<string>('market_cap');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'eps-revenue' | 'guidance'>('eps-revenue');
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string | null>('market_cap');
  
  // Refs for header synchronization
  const leftHeaderRef = useRef<HTMLTableSectionElement>(null);
  const rightHeaderRef = useRef<HTMLTableSectionElement>(null);

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
    } else {
      return `${num.toFixed(0)}`;
    }
  };

  const formatMarketCapDiff = (value: bigint | null) => {
    if (!value) return '-';
    const num = Number(value);
    const absNum = Math.abs(num);
    const sign = num >= 0 ? '+' : '';
    
    if (absNum >= 1e12) {
      return `${sign}${(absNum / 1e12).toFixed(1)}T`;
    } else if (absNum >= 1e9) {
      return `${sign}${(absNum / 1e9).toFixed(1)}B`;
    } else if (absNum >= 1e6) {
      return `${sign}${(absNum / 1e6).toFixed(1)}M`;
    } else if (absNum >= 1e3) {
      return `${sign}${(absNum / 1e3).toFixed(1)}K`;
    } else {
      return `${sign}${absNum.toFixed(0)}`;
    }
  };

  const formatPrice = (value: number | null) => {
    if (!value) return '-';
    return `$${value.toFixed(2)}`;
  };

  const formatPriceChange = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatEPS = (value: number | null) => {
    if (!value) return '-';
    return `$${value.toFixed(2)}`;
  };

  const formatRevenue = (value: string | bigint | null) => {
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
    } else {
      return `$${num.toFixed(0)}`;
    }
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
    } else {
      return `$${num.toFixed(0)}`;
    }
  };

  const formatPercentage = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatBillions = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}B`;
  };

  const formatSurprise = (actual: number | string | bigint | null, estimate: number | string | bigint | null) => {
    if (!actual || !estimate) return '-';
    const actualNum = typeof actual === 'string' ? Number(actual) : typeof actual === 'bigint' ? Number(actual) : actual;
    const estimateNum = typeof estimate === 'string' ? Number(estimate) : typeof estimate === 'bigint' ? Number(estimate) : estimate;
    const surprise = ((actualNum - estimateNum) / estimateNum) * 100;
    return `${surprise >= 0 ? '+' : ''}${surprise.toFixed(1)}%`;
  };

  const formatGuidanceSurprise = (
    surprise: number | null,
    basis: string | null,
    extreme: boolean | null,
    warnings: string[] = []
  ) => {
    if (surprise === null) return '-';
    
    const display = formatGuidePercent(surprise);
    let className = 'text-gray-900';
    let tooltip = getGuidanceTitle(basis, surprise);
    
    if (extreme) {
      className = 'text-orange-500 font-semibold';
      tooltip += ' (EXTREME VALUE >300%)';
    } else if (surprise > 0) {
      className = 'text-emerald-600';
    } else if (surprise < 0) {
      className = 'text-rose-600';
    }
    
    if (warnings.length > 0) {
      tooltip += `\nWarnings: ${warnings.join(', ')}`;
    }
    
    return (
      <span className={className} title={tooltip}>
        {display}
        {extreme && <span className="text-xs ml-1">!</span>}
        {warnings.length > 0 && <span className="text-xs ml-1">⚠️</span>}
      </span>
    );
  };

  const getSizeClass = (size: string | null) => {
    switch (size) {
      case 'Large': return 'bg-green-100 text-green-800';
      case 'Mid': return 'bg-yellow-100 text-yellow-800';
      case 'Small': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDiffClass = (value: bigint | null) => {
    if (!value) return '';
    const num = Number(value);
    return num >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getPriceChangeClass = (value: number | null) => {
    if (value === null || value === undefined) return '';
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getSurpriseClass = (actual: number | bigint | string | null, estimate: number | bigint | string | null) => {
    if (!actual || !estimate) return '';
    const actualNum = typeof actual === 'bigint' ? Number(actual) : typeof actual === 'string' ? Number(actual) : actual;
    const estimateNum = typeof estimate === 'bigint' ? Number(estimate) : typeof estimate === 'string' ? Number(estimate) : estimate;
    return actualNum >= estimateNum ? 'text-green-600' : 'text-red-600';
  };

  // Helper function to check if value is null/empty (should be ignored in sorting)
  const isNullValue = (value: any): boolean => {
    return value === null || value === undefined || value === 0 || value === '';
  };

  // Sort and filter data
  const sortedData = useMemo(() => {
    let filtered = data.filter(item => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.ticker.toLowerCase().includes(term) ||
        item.companyName?.toLowerCase().includes(term) ||
        item.sector?.toLowerCase().includes(term) ||
        item.companyType?.toLowerCase().includes(term)
      );
    });

    return filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'ticker':
          aValue = a.ticker;
          bValue = b.ticker;
          break;
        case 'company':
          aValue = a.companyName || a.ticker;
          bValue = b.companyName || b.ticker;
          break;
        case 'size':
          aValue = a.size || '';
          bValue = b.size || '';
          break;
        case 'market_cap':
          aValue = a.marketCap ? Number(a.marketCap) : null;
          bValue = b.marketCap ? Number(b.marketCap) : null;
          break;
        case 'cap_diff':
          aValue = a.marketCapDiffBillions;
          bValue = b.marketCapDiffBillions;
          break;
        case 'price':
          aValue = a.currentPrice;
          bValue = b.currentPrice;
          break;
        case 'change':
          aValue = a.priceChangePercent;
          bValue = b.priceChangePercent;
          break;
        case 'eps_estimate':
          aValue = a.epsEstimate;
          bValue = b.epsEstimate;
          break;
        case 'eps_actual':
          aValue = a.epsActual;
          bValue = b.epsActual;
          break;
        case 'eps_surprise':
          aValue = a.epsActual && a.epsEstimate ? ((a.epsActual - a.epsEstimate) / a.epsEstimate) * 100 : null;
          bValue = b.epsActual && b.epsEstimate ? ((b.epsActual - b.epsEstimate) / b.epsEstimate) * 100 : null;
          break;
        case 'revenue_estimate':
          aValue = a.revenueEstimate ? Number(a.revenueEstimate) : null;
          bValue = b.revenueEstimate ? Number(b.revenueEstimate) : null;
          break;
        case 'revenue_actual':
          aValue = a.revenueActual ? Number(a.revenueActual) : null;
          bValue = b.revenueActual ? Number(b.revenueActual) : null;
          break;
        case 'revenue_surprise':
          aValue = a.revenueActual && a.revenueEstimate ? ((Number(a.revenueActual) - Number(a.revenueEstimate)) / Number(a.revenueEstimate)) * 100 : null;
          bValue = b.revenueActual && b.revenueEstimate ? ((Number(b.revenueActual) - Number(b.revenueEstimate)) / Number(b.revenueEstimate)) * 100 : null;
          break;
        case 'eps_guide':
          aValue = a.guidanceData?.estimatedEpsGuidance;
          bValue = b.guidanceData?.estimatedEpsGuidance;
          break;
        case 'eps_guide_surp':
          aValue = a.epsGuideSurprise;
          bValue = b.epsGuideSurprise;
          break;
        case 'rev_guide':
          aValue = a.guidanceData?.estimatedRevenueGuidance ? Number(a.guidanceData.estimatedRevenueGuidance) : null;
          bValue = b.guidanceData?.estimatedRevenueGuidance ? Number(b.guidanceData.estimatedRevenueGuidance) : null;
          break;
        case 'rev_guide_surp':
          aValue = a.revenueGuideSurprise;
          bValue = b.revenueGuideSurprise;
          break;
        default:
          aValue = a.ticker;
          bValue = b.ticker;
      }

      // Handle null values - put them at the end regardless of sort direction
      const aIsNull = isNullValue(aValue);
      const bIsNull = isNullValue(bValue);
      
      if (aIsNull && bIsNull) return 0; // Both null, maintain order
      if (aIsNull) return 1; // a is null, put it after b
      if (bIsNull) return -1; // b is null, put it after a

      // Both values are not null, proceed with normal sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'bigint' && typeof bValue === 'bigint') {
        return sortDirection === 'asc' 
          ? Number(aValue) - Number(bValue)
          : Number(bValue) - Number(aValue);
      }

      return sortDirection === 'asc' 
        ? (aValue < bValue ? -1 : aValue > bValue ? 1 : 0)
        : (aValue > bValue ? -1 : aValue < bValue ? 1 : 0);
    });
  }, [data, sortField, sortDirection, searchTerm]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setSelectedColumn(field);
    
    // Track sorting event
    trackTableSort(field, sortField === field ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'asc');
  };

  const handleColumnHover = (field: string | null) => {
    setHoveredColumn(field);
  };

  const handleColumnClick = (field: string) => {
    setSelectedColumn(field);
    handleSort(field);
  };

  const SortButton = ({ field, children, align = 'left', padding = 'px-2 py-3' }: { field: string; children: React.ReactNode; align?: 'left' | 'right' | 'center'; padding?: string }) => {
    const isHovered = hoveredColumn === field;
    const isSelected = selectedColumn === field;
    
    const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
    
    return (
      <button
        onClick={() => handleColumnClick(field)}
        className={`w-full h-full ${padding} ${alignClass} font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isSelected 
            ? 'bg-blue-200 text-blue-800' 
            : isHovered 
              ? 'bg-blue-50 text-gray-700' 
              : 'bg-transparent text-gray-700'
        }`}
        aria-sort={isSelected ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        {children}
      </button>
    );
  };

  // Synchronize header heights
  const syncHeaderHeights = () => {
    if (leftHeaderRef.current && rightHeaderRef.current) {
      const leftHeight = leftHeaderRef.current.getBoundingClientRect().height;
      const rightHeight = rightHeaderRef.current.getBoundingClientRect().height;
      const maxHeight = Math.max(leftHeight, rightHeight);
      
      // Set both headers to the same height
      leftHeaderRef.current.style.height = `${maxHeight}px`;
      rightHeaderRef.current.style.height = `${maxHeight}px`;
    }
  };

  // Set initial height immediately when component mounts
  useEffect(() => {
    // Set initial height immediately
    syncHeaderHeights();
    
    // Then sync again after a short delay to ensure proper rendering
    const timer1 = setTimeout(syncHeaderHeights, 50);
    const timer2 = setTimeout(syncHeaderHeights, 200);
    
    // Use ResizeObserver for better synchronization
    let resizeObserver: ResizeObserver | null = null;
    
    if (leftHeaderRef.current && rightHeaderRef.current) {
      resizeObserver = new ResizeObserver(() => {
        setTimeout(syncHeaderHeights, 10);
      });
      
      resizeObserver.observe(leftHeaderRef.current);
      resizeObserver.observe(rightHeaderRef.current);
    }
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  // Sync headers when view changes or data loads
  useEffect(() => {
    const timer1 = setTimeout(syncHeaderHeights, 50);
    const timer2 = setTimeout(syncHeaderHeights, 200);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [activeView, data]);

  // Sync headers on window resize
  useEffect(() => {
    const handleResize = () => {
      setTimeout(syncHeaderHeights, 50);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div>
      {/* Header - Outside of table container */}
      <div className="px-4 py-6 overflow-x-auto">
        <div className="flex items-center justify-between min-w-max">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Today's Earnings</h2>
            <p className="text-sm text-gray-600 mt-1">
              {data.length} companies reporting earnings today
            </p>
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-between min-w-max">
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
            className="w-80 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          {/* View Toggle Buttons */}
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
        </div>
      </div>

      {/* Table Container - Now with rounded corners */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-300">
        {/* Table Structure - CSS Grid Layout */}
        <div 
          className="overflow-x-hidden"
          style={{
            ['--fixed' as any]: '292px', // 48 + 64 + 180 (menšie, ale čitateľné)
            ['--colW' as any]: 'clamp(80px, calc((100% - var(--fixed)) / 11), 112px)', // stabilný aj pri zoome
            ['--sep' as any]: '1px', // 1px hranica medzi ľavou a pravou tabuľkou
            display: 'grid',
            gridTemplateColumns: 'calc(var(--fixed) + (5 * var(--colW))) minmax(0, 1fr)',
            columnGap: '0px',
          }}
        >
          {/* Left Table - 3 Fixed + 5 Dynamic Columns */}
          <div 
            className="border-r border-gray-200 box-border"
          >
            <table className="w-full border-collapse" aria-label="Earnings table — Left section">
              <caption className="sr-only">Company information, market data, and price changes</caption>
              <colgroup>
                <col style={{ width: '48px' }} />
                <col style={{ width: '64px' }} />
                <col style={{ width: '180px' }} />
                {[...Array(5)].map((_, i) => <col key={i} style={{ width: 'var(--colW)' }} />)}
              </colgroup>
              <thead ref={leftHeaderRef} className="bg-blue-100 border-b border-gray-300">
                <tr>
                  <th 
                    className="text-xs font-medium text-gray-500 uppercase tracking-wider" 
                    scope="col"
                    onMouseEnter={() => handleColumnHover('rank')}
                    onMouseLeave={() => handleColumnHover(null)}
                  >
                    <SortButton field="rank" align="left" padding="px-2 py-3">#</SortButton>
                  </th>
                  <th 
                    className="text-xs font-medium text-gray-500 uppercase tracking-wider" 
                    scope="col"
                    onMouseEnter={() => handleColumnHover('ticker')}
                    onMouseLeave={() => handleColumnHover(null)}
                  >
                    <SortButton field="ticker" align="left" padding="px-2 py-3">Ticker</SortButton>
                  </th>
                  <th 
                    className="text-xs font-medium text-gray-500 uppercase tracking-wider" 
                    scope="col"
                    onMouseEnter={() => handleColumnHover('company')}
                    onMouseLeave={() => handleColumnHover(null)}
                  >
                    <SortButton field="company" align="left" padding="px-4 py-3">Company</SortButton>
                  </th>
                  <th 
                    className="text-xs font-medium text-gray-500 uppercase tracking-wider" 
                    scope="col"
                    onMouseEnter={() => handleColumnHover('size')}
                    onMouseLeave={() => handleColumnHover(null)}
                  >
                    <SortButton field="size" align="center" padding="px-2 py-3">Size</SortButton>
                  </th>
                  <th 
                    className="text-xs font-medium text-gray-500 uppercase tracking-wider" 
                    scope="col"
                    onMouseEnter={() => handleColumnHover('market_cap')}
                    onMouseLeave={() => handleColumnHover(null)}
                  >
                    <SortButton field="market_cap" align="center" padding="px-2 py-3">Market Cap</SortButton>
                  </th>
                  <th 
                    className="text-xs font-medium text-gray-500 uppercase tracking-wider" 
                    scope="col"
                    onMouseEnter={() => handleColumnHover('cap_diff')}
                    onMouseLeave={() => handleColumnHover(null)}
                  >
                    <SortButton field="cap_diff" align="center" padding="px-2 py-3">Cap Diff</SortButton>
                  </th>
                  <th 
                    className="text-xs font-medium text-gray-500 uppercase tracking-wider" 
                    scope="col"
                    onMouseEnter={() => handleColumnHover('price')}
                    onMouseLeave={() => handleColumnHover(null)}
                  >
                    <SortButton field="price" align="center" padding="px-2 py-3">Price</SortButton>
                  </th>
                  <th 
                    className="text-xs font-medium text-gray-500 uppercase tracking-wider" 
                    scope="col"
                    onMouseEnter={() => handleColumnHover('change')}
                    onMouseLeave={() => handleColumnHover(null)}
                  >
                    <SortButton field="change" align="center" padding="px-2 py-3">Change</SortButton>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center">
                      <LoadingSpinner size="md" />
                    </td>
                  </tr>
                ) : sortedData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No earnings data found
                    </td>
                  </tr>
                ) : (
                  sortedData.map((item, index) => (
                    <tr key={item.ticker} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-2 py-3 text-sm text-gray-900">{index + 1}</td>
                      <td className="px-2 py-3 text-sm font-medium text-gray-900">
                        {item.ticker}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 truncate" title={item.companyName || item.ticker}>
                        {item.companyName || item.ticker}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.size || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {item.marketCap ? formatMarketCap(item.marketCap) : '-'}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right ${getDiffClass(item.marketCapDiffBillions ? BigInt(Math.round(item.marketCapDiffBillions * 1e9)) : null)}`}>
                        {item.marketCapDiffBillions ? formatBillions(item.marketCapDiffBillions) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {item.currentPrice ? `$${item.currentPrice.toFixed(2)}` : '-'}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right ${getPriceChangeClass(item.priceChangePercent)}`}>
                        {item.priceChangePercent ? formatPercentage(item.priceChangePercent) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Right Table - 6 Dynamic Columns */}
          <div className="box-border">
            {activeView === 'eps-revenue' ? (
              // EPS & Revenue Table
              <table className="w-full border-collapse table-fixed" aria-label="Earnings table — EPS & Revenue view">
                <caption className="sr-only">EPS estimates, actuals, surprises and revenue data</caption>
                <colgroup>
                  {[...Array(6)].map((_, i) => <col key={i} style={{ width: '1fr' }} />)}
                </colgroup>
                <thead ref={rightHeaderRef} className="bg-blue-100 border-b border-gray-300">
                  <tr>
                    <th 
                      className="text-xs font-medium text-gray-500 uppercase tracking-wider" 
                      scope="col"
                      onMouseEnter={() => handleColumnHover('eps_estimate')}
                      onMouseLeave={() => handleColumnHover(null)}
                    >
                      <SortButton field="eps_estimate" align="center" padding="px-2 py-3">EPS Est</SortButton>
                    </th>
                    <th 
                      className="text-xs font-medium text-gray-500 uppercase tracking-wider" 
                      scope="col"
                      onMouseEnter={() => handleColumnHover('eps_actual')}
                      onMouseLeave={() => handleColumnHover(null)}
                    >
                      <SortButton field="eps_actual" align="center" padding="px-2 py-3">EPS Act</SortButton>
                    </th>
                    <th 
                      className="text-xs font-medium text-gray-500 uppercase tracking-wider" 
                      scope="col"
                      onMouseEnter={() => handleColumnHover('eps_surprise')}
                      onMouseLeave={() => handleColumnHover(null)}
                    >
                      <SortButton field="eps_surprise" align="center" padding="px-2 py-3">EPS Surp</SortButton>
                    </th>
                    <th 
                      className="text-xs font-medium text-gray-500 uppercase tracking-wider" 
                      scope="col"
                      onMouseEnter={() => handleColumnHover('revenue_estimate')}
                      onMouseLeave={() => handleColumnHover(null)}
                    >
                      <SortButton field="revenue_estimate" align="center" padding="px-2 py-3">Rev Est</SortButton>
                    </th>
                    <th 
                      className="text-xs font-medium text-gray-500 uppercase tracking-wider" 
                      scope="col"
                      onMouseEnter={() => handleColumnHover('revenue_actual')}
                      onMouseLeave={() => handleColumnHover(null)}
                    >
                      <SortButton field="revenue_actual" align="center" padding="px-2 py-3">Rev Act</SortButton>
                    </th>
                    <th 
                      className="text-xs font-medium text-gray-500 uppercase tracking-wider" 
                      scope="col"
                      onMouseEnter={() => handleColumnHover('revenue_surprise')}
                      onMouseLeave={() => handleColumnHover(null)}
                    >
                      <SortButton field="revenue_surprise" align="center" padding="px-2 py-3">Rev Surp</SortButton>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedData.map((item, index) => (
                    <tr key={item.ticker} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-2 py-3 text-sm text-gray-600 text-right">
                        {formatEPS(item.epsEstimate)}
                      </td>
                      <td className="px-2 py-3 text-sm text-gray-900 text-right">
                        {formatEPS(item.epsActual)}
                      </td>
                      <td className={`px-2 py-3 text-sm text-right font-medium ${getSurpriseClass(item.epsActual, item.epsEstimate)}`}>
                        {formatSurprise(item.epsActual, item.epsEstimate)}
                      </td>
                      <td className="px-2 py-3 text-sm text-gray-600 text-right">
                        {formatRevenue(item.revenueEstimate)}
                      </td>
                      <td className="px-2 py-3 text-sm text-gray-900 text-right">
                        {formatRevenue(item.revenueActual)}
                      </td>
                      <td className={`px-2 py-3 text-sm text-right font-medium ${getSurpriseClass(item.revenueActual, item.revenueEstimate)}`}>
                        {formatSurprise(item.revenueActual, item.revenueEstimate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              // Guidance Table
              <table className="w-full border-collapse table-fixed" aria-label="Earnings table — Guidance view">
                <caption className="sr-only">EPS and revenue guidance with surprises and period information</caption>
                <colgroup>
                  {[...Array(6)].map((_, i) => <col key={i} style={{ width: '1fr' }} />)}
                </colgroup>
                <thead ref={rightHeaderRef} className="bg-blue-100 border-b border-gray-300">
                  <tr>
                    <th 
                      className="text-xs font-medium text-gray-500 uppercase tracking-wider" 
                      scope="col"
                      onMouseEnter={() => handleColumnHover('eps_guide')}
                      onMouseLeave={() => handleColumnHover(null)}
                    >
                      <SortButton field="eps_guide" align="center" padding="px-2 py-3">EPS Guide</SortButton>
                    </th>
                    <th 
                      className="text-xs font-medium text-gray-500 uppercase tracking-wider" 
                      scope="col"
                      onMouseEnter={() => handleColumnHover('eps_guide_surp')}
                      onMouseLeave={() => handleColumnHover(null)}
                    >
                      <SortButton field="eps_guide_surp" align="center" padding="px-2 py-3">EPS G Surp</SortButton>
                    </th>
                    <th 
                      className="text-xs font-medium text-gray-500 uppercase tracking-wider" 
                      scope="col"
                      onMouseEnter={() => handleColumnHover('rev_guide')}
                      onMouseLeave={() => handleColumnHover(null)}
                    >
                      <SortButton field="rev_guide" align="center" padding="px-2 py-3">Rev Guide</SortButton>
                    </th>
                    <th 
                      className="text-xs font-medium text-gray-500 uppercase tracking-wider" 
                      scope="col"
                      onMouseEnter={() => handleColumnHover('rev_guide_surp')}
                      onMouseLeave={() => handleColumnHover(null)}
                    >
                      <SortButton field="rev_guide_surp" align="center" padding="px-2 py-3">Rev G Surp</SortButton>
                    </th>
                    <th 
                      className="text-xs font-medium text-gray-500 uppercase tracking-wider" 
                      scope="col"
                      onMouseEnter={() => handleColumnHover('guidance_period')}
                      onMouseLeave={() => handleColumnHover(null)}
                    >
                      <SortButton field="guidance_period" align="center" padding="px-2 py-3">Period</SortButton>
                    </th>
                    <th 
                      className="text-xs font-medium text-gray-500 uppercase tracking-wider" 
                      scope="col"
                      onMouseEnter={() => handleColumnHover('guidance_confidence')}
                      onMouseLeave={() => handleColumnHover(null)}
                    >
                      <SortButton field="guidance_confidence" align="center" padding="px-2 py-3">Notes</SortButton>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedData.map((item, index) => (
                    <tr key={item.ticker} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-2 py-3 text-sm text-gray-600 text-right">
                        {item.guidanceData?.estimatedEpsGuidance ? `$${item.guidanceData.estimatedEpsGuidance.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-2 py-3 text-sm text-right">
                        {formatGuidanceSurprise(
                          item.epsGuideSurprise,
                          item.epsGuideBasis,
                          item.epsGuideExtreme,
                          []
                        )}
                      </td>
                      <td className="px-2 py-3 text-sm text-gray-600 text-right">
                        {item.guidanceData?.estimatedRevenueGuidance ? formatCurrency(item.guidanceData.estimatedRevenueGuidance) : '-'}
                      </td>
                      <td className="px-2 py-3 text-sm text-right">
                        {formatGuidanceSurprise(
                          item.revenueGuideSurprise,
                          item.revenueGuideBasis,
                          item.revenueGuideExtreme,
                          []
                        )}
                      </td>
                      <td className="px-2 py-3 text-sm text-gray-600 text-center">
                        {item.fiscalPeriod || '-'}
                      </td>
                      <td className="px-2 py-3 text-sm text-gray-600 text-center">
                        {item.guidanceData?.lastUpdated ? (() => {
                          const date = new Date(item.guidanceData.lastUpdated);
                          return isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
                        })() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
