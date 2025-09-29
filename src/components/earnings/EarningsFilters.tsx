/**
 * 🔍 EARNINGS FILTERS
 * Modulárny filter komponent pre earnings tabuľku
 */

import { memo, useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { FilterConfig, EarningsStats } from './types';
import { getUniqueSectors, getUniqueSizes } from './utils';

interface EarningsFiltersProps {
  filterConfig: FilterConfig;
  onFilterChange: (config: FilterConfig) => void;
  stats: EarningsStats;
  data: any[]; // Pre získanie unikátnych hodnôt
}

export const EarningsFilters = memo(function EarningsFilters({
  filterConfig,
  onFilterChange,
  stats,
  data
}: EarningsFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const sectors = getUniqueSectors(data);
  const sizes = getUniqueSizes(data);

  const handleSearchChange = (value: string) => {
    onFilterChange({ ...filterConfig, searchTerm: value });
  };

  const handleShowOnlyWithActualChange = (checked: boolean) => {
    onFilterChange({ ...filterConfig, showOnlyWithActual: checked });
  };

  const handleSizeFilterChange = (size: string | null) => {
    onFilterChange({ ...filterConfig, sizeFilter: size });
  };

  const handleSectorFilterChange = (sector: string | null) => {
    onFilterChange({ ...filterConfig, sectorFilter: sector });
  };

  const clearFilters = () => {
    onFilterChange({
      searchTerm: '',
      showOnlyWithActual: false,
      sizeFilter: null,
      sectorFilter: null
    });
  };

  const hasActiveFilters = 
    filterConfig.searchTerm ||
    filterConfig.showOnlyWithActual ||
    filterConfig.sizeFilter ||
    filterConfig.sectorFilter;

  return (
    <div className="bg-white p-4 border-b border-gray-200">
      {/* Basic Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search ticker, company, or sector..."
            value={filterConfig.searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Show Only With Actual */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filterConfig.showOnlyWithActual}
            onChange={(e) => handleShowOnlyWithActualChange(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            Only with actual data ({stats.withBothActual})
          </span>
        </label>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Filter className="w-4 h-4" />
          Advanced
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-lg hover:bg-red-50"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          {/* Size Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Size
            </label>
            <select
              value={filterConfig.sizeFilter || ''}
              onChange={(e) => handleSizeFilterChange(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Sizes</option>
              {sizes.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          {/* Sector Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sector
            </label>
            <select
              value={filterConfig.sectorFilter || ''}
              onChange={(e) => handleSectorFilterChange(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Sectors</option>
              {sectors.map(sector => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-sm text-gray-600">Active filters:</span>
          {filterConfig.searchTerm && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Search: "{filterConfig.searchTerm}"
            </span>
          )}
          {filterConfig.showOnlyWithActual && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              With Actual Data
            </span>
          )}
          {filterConfig.sizeFilter && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Size: {filterConfig.sizeFilter}
            </span>
          )}
          {filterConfig.sectorFilter && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              Sector: {filterConfig.sectorFilter}
            </span>
          )}
        </div>
      )}
    </div>
  );
});
