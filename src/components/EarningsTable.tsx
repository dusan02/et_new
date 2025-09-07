'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface EarningsData {
  id: number;
  reportDate: string;
  ticker: string;
  reportTime: string;
  epsActual: number | null;
  epsEstimate: number | null;
  revenueActual: bigint | null;
  revenueEstimate: bigint | null;
  sector: string | null;
  movement: {
    id: number;
    ticker: string;
    companyName: string;
    currentPrice: number;
    previousClose: number;
    marketCap: bigint;
    size: string;
    marketCapDiff: bigint;
    marketCapDiffBillions: number;
    priceChangePercent: number;
    sharesOutstanding: bigint;
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
  const formatCurrency = (value: bigint | null) => {
    if (!value) return '-';
    const num = Number(value);
    
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

  const formatRevenue = (value: bigint | null) => {
    if (!value) return '-';
    const num = Number(value);
    
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

  const formatSurprise = (actual: number | bigint | null, estimate: number | bigint | null) => {
    if (!actual || !estimate) return '-';
    const actualNum = typeof actual === 'bigint' ? Number(actual) : actual;
    const estimateNum = typeof estimate === 'bigint' ? Number(estimate) : estimate;
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
    
    const display = `${surprise >= 0 ? '+' : ''}${surprise.toFixed(1)}%`;
    let className = 'text-gray-900';
    let tooltip = `Basis: ${basis || 'unknown'}`;
    
    if (extreme) {
      className = 'text-red-600 font-bold';
      tooltip += ' (EXTREME VALUE >300%)';
    } else if (surprise > 0) {
      className = 'text-green-600';
    } else if (surprise < 0) {
      className = 'text-red-600';
    }
    
    if (warnings.length > 0) {
      tooltip += `\nWarnings: ${warnings.join(', ')}`;
    }
    
    return (
      <span className={className} title={tooltip}>
        {display}
        {extreme && <span className="text-xs ml-1">⚠️</span>}
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

  const getSurpriseClass = (actual: number | bigint | null, estimate: number | bigint | null) => {
    if (!actual || !estimate) return '';
    const actualNum = typeof actual === 'bigint' ? Number(actual) : actual;
    const estimateNum = typeof estimate === 'bigint' ? Number(estimate) : estimate;
    return actualNum >= estimateNum ? 'text-green-600' : 'text-red-600';
  };

  // Sort and filter data
  const sortedData = useMemo(() => {
    let filtered = data.filter(item => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
          return (
        item.ticker.toLowerCase().includes(term) ||
        item.movement?.companyName?.toLowerCase().includes(term)
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
          aValue = a.movement?.companyName || a.ticker;
          bValue = b.movement?.companyName || b.ticker;
          break;
        case 'size':
          aValue = a.movement?.size || '';
          bValue = b.movement?.size || '';
          break;
        case 'market_cap':
          aValue = a.movement?.marketCap || BigInt(0);
          bValue = b.movement?.marketCap || BigInt(0);
          break;
        case 'market_cap_gain':
          aValue = a.movement?.marketCapDiff || BigInt(0);
          bValue = b.movement?.marketCapDiff || BigInt(0);
          break;
        case 'price':
          aValue = a.movement?.currentPrice || 0;
          bValue = b.movement?.currentPrice || 0;
          break;
        case 'today':
          aValue = a.movement?.priceChangePercent || 0;
          bValue = b.movement?.priceChangePercent || 0;
          break;
        case 'eps_estimate':
          aValue = a.epsEstimate || 0;
          bValue = b.epsEstimate || 0;
          break;
        case 'eps_actual':
          aValue = a.epsActual || 0;
          bValue = b.epsActual || 0;
          break;
        case 'eps_surprise':
          aValue = a.epsActual && a.epsEstimate ? ((a.epsActual - a.epsEstimate) / a.epsEstimate) * 100 : 0;
          bValue = b.epsActual && b.epsEstimate ? ((b.epsActual - b.epsEstimate) / b.epsEstimate) * 100 : 0;
          break;
        case 'revenue_estimate':
          aValue = a.revenueEstimate || BigInt(0);
          bValue = b.revenueEstimate || BigInt(0);
          break;
        case 'revenue_actual':
          aValue = a.revenueActual || BigInt(0);
          bValue = b.revenueActual || BigInt(0);
          break;
        case 'revenue_surprise':
          aValue = a.revenueActual && a.revenueEstimate ? ((Number(a.revenueActual) - Number(a.revenueEstimate)) / Number(a.revenueEstimate)) * 100 : 0;
          bValue = b.revenueActual && b.revenueEstimate ? ((Number(b.revenueActual) - Number(b.revenueEstimate)) / Number(b.revenueEstimate)) * 100 : 0;
          break;
        default:
          aValue = a.ticker;
          bValue = b.ticker;
      }

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
  };

  const handleColumnHover = (field: string | null) => {
    setHoveredColumn(field);
  };

  const handleColumnClick = (field: string) => {
    setSelectedColumn(field);
    handleSort(field);
  };

  const SortButton = ({ field, children }: { field: string; children: React.ReactNode }) => {
    const isHovered = hoveredColumn === field;
    const isSelected = selectedColumn === field;
          
          return (
      <button
        onClick={() => handleColumnClick(field)}
        onMouseEnter={() => handleColumnHover(field)}
        onMouseLeave={() => handleColumnHover(null)}
        className={`absolute inset-0 w-full h-full text-center font-semibold transition-colors duration-200 ${
          isSelected 
            ? 'bg-blue-200 text-blue-800' 
            : isHovered 
              ? 'bg-blue-100 text-gray-700' 
              : 'bg-transparent text-gray-700'
        }`}
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Today's Earnings</h2>
            <p className="text-sm text-gray-600 mt-1">
              {data.length} companies reporting earnings today
            </p>
          </div>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <input
            type="text"
            placeholder="Search tickers, companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          {/* View Toggle Buttons */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveView('eps-revenue')}
              className={`px-4 py-2 rounded-md font-medium transition-all ${
                activeView === 'eps-revenue' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              EPS & Revenue
            </button>
            <button
              onClick={() => setActiveView('guidance')}
              className={`px-4 py-2 rounded-md font-medium transition-all ${
                activeView === 'guidance' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Guidance
            </button>
          </div>
        </div>
      </div>

      {/* Triple Table Structure */}
      <div className="flex">
        {/* Left Table - Fixed Columns */}
        <div className="flex-1 border-r border-gray-200">
        <table className="w-full">
              <thead ref={leftHeaderRef} className="bg-blue-50">
              <tr>
                <th className="relative px-4 py-5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortButton field="rank">#</SortButton>
                </th>
                <th className="relative px-4 py-5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortButton field="ticker">Ticker</SortButton>
                </th>
                <th className="relative px-4 py-5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortButton field="company">Company</SortButton>
                </th>
                <th className="relative px-4 py-5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortButton field="size">Size</SortButton>
                </th>
                <th className="relative px-4 py-5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortButton field="market_cap">Market Cap</SortButton>
                </th>
                <th className="relative px-4 py-5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortButton field="market_cap_gain">Cap Diff</SortButton>
                </th>
                <th className="relative px-4 py-5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortButton field="price">Price</SortButton>
                </th>
                <th className="relative px-4 py-5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortButton field="today">Change</SortButton>
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
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm text-gray-900">{index + 1}</td>
                    <td className="px-4 py-4 text-sm font-medium text-blue-600">
                      {item.ticker}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 max-w-[120px] truncate">
                      {item.movement?.companyName || item.ticker}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSizeClass(item.movement?.size || null)}`}>
                        {item.movement?.size || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 text-right">
                      {formatCurrency(item.movement?.marketCap || null)}
                    </td>
                    <td className={`px-4 py-4 text-sm text-right font-medium ${getDiffClass(item.movement?.marketCapDiff || null)}`}>
                      {formatMarketCapDiff(item.movement?.marketCapDiff || null)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 text-right">
                      {formatPrice(item.movement?.currentPrice || null)}
                    </td>
                    <td className={`px-4 py-4 text-sm text-right font-medium ${getPriceChangeClass(item.movement?.priceChangePercent || null)}`}>
                      {formatPriceChange(item.movement?.priceChangePercent || null)}
                    </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        {/* Right Table - Dynamic Columns */}
        <div className="flex-1">
          {activeView === 'eps-revenue' ? (
            // EPS & Revenue Table
            <table className="w-full">
              <thead ref={rightHeaderRef} className="bg-blue-50">
                <tr>
                  <th className="relative px-4 py-5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="eps_estimate">EPS Est</SortButton>
                  </th>
                  <th className="relative px-4 py-5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="eps_actual">EPS Act</SortButton>
                  </th>
                  <th className="relative px-4 py-5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="eps_surprise">EPS Surp</SortButton>
                  </th>
                  <th className="relative px-4 py-5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="revenue_estimate">Rev Est</SortButton>
                  </th>
                  <th className="relative px-4 py-5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="revenue_actual">Rev Act</SortButton>
                  </th>
                  <th className="relative px-4 py-5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="revenue_surprise">Rev Surp</SortButton>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedData.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm text-gray-600 text-right">
                      {formatEPS(item.epsEstimate)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 text-right">
                      {formatEPS(item.epsActual)}
                    </td>
                    <td className={`px-4 py-4 text-sm text-right font-medium ${getSurpriseClass(item.epsActual, item.epsEstimate)}`}>
                      {formatSurprise(item.epsActual, item.epsEstimate)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 text-right">
                      {formatRevenue(item.revenueEstimate)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 text-right">
                      {formatRevenue(item.revenueActual)}
                    </td>
                    <td className={`px-4 py-4 text-sm text-right font-medium ${getSurpriseClass(item.revenueActual, item.revenueEstimate)}`}>
                      {formatSurprise(item.revenueActual, item.revenueEstimate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            // Guidance Table
            <table className="w-full">
              <thead ref={rightHeaderRef} className="bg-blue-50">
                <tr>
                  <th className="relative px-4 py-5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="eps_guide">EPS Guide</SortButton>
                  </th>
                  <th className="relative px-4 py-5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="eps_guide_surp">EPS G Surp</SortButton>
                  </th>
                  <th className="relative px-4 py-5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="rev_guide">Rev Guide</SortButton>
                  </th>
                  <th className="relative px-4 py-5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="rev_guide_surp">Rev G Surp</SortButton>
                  </th>
                  <th className="relative px-4 py-5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="guidance_period">Period</SortButton>
                  </th>
                  <th className="relative px-4 py-5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton field="guidance_confidence">Notes</SortButton>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedData.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm text-gray-600 text-right">
                      {item.epsGuidance ? item.epsGuidance.toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-right">
                      {formatGuidanceSurprise(
                        item.epsGuideSurprise,
                        item.epsGuideBasis,
                        item.epsGuideExtreme,
                        []
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 text-right">
                      {item.revenueGuidance ? formatCurrency(item.revenueGuidance) : '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-right">
                      {formatGuidanceSurprise(
                        item.revenueGuideSurprise,
                        item.revenueGuideBasis,
                        item.revenueGuideExtreme,
                        []
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 text-center">
                      {item.guidancePeriod || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 text-center">
                      {item.guidanceConfidence ? `${item.guidanceConfidence}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
