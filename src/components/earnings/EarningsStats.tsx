/**
 * 📊 EARNINGS STATS COMPONENT
 * Modulárny stats komponent pre earnings
 */

import { memo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Building2 } from 'lucide-react';
import { EarningsStats as EarningsStatsType } from './types';

interface EarningsStatsProps {
  stats: EarningsStatsType;
  isLoading?: boolean;
}

export const EarningsStats = memo(function EarningsStats({
  stats,
  isLoading = false
}: EarningsStatsProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          📊 Earnings Statistics
        </h2>
        <div className="text-gray-500 text-center py-8">
          Loading stats...
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          📊 Earnings Statistics
        </h2>
        <div className="text-gray-500 text-center py-8">
          No statistics available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        📊 Earnings Statistics
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Companies */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Total Companies</p>
              <p className="text-2xl font-bold text-blue-900">{stats.totalCompanies}</p>
            </div>
          </div>
        </div>

        {/* With EPS Actual */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">With EPS Actual</p>
              <p className="text-2xl font-bold text-green-900">{stats.withEpsActual}</p>
            </div>
          </div>
        </div>

        {/* With Revenue Actual */}
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-600">With Revenue Actual</p>
              <p className="text-2xl font-bold text-purple-900">{stats.withRevenueActual}</p>
            </div>
          </div>
        </div>

        {/* With Both Actual */}
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center">
            <TrendingDown className="h-8 w-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-orange-600">With Both Actual</p>
              <p className="text-2xl font-bold text-orange-900">{stats.withBothActual}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Without Any Actual</h3>
          <p className="text-xl font-bold text-gray-900">{stats.withoutAnyActual}</p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Last Updated</h3>
          <p className="text-sm text-gray-900">
            {new Date(stats.lastUpdated).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
});
