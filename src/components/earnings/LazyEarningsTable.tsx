/**
 * 🚀 LAZY EARNINGS TABLE
 * Lazy loading komponent pre optimalizované načítanie
 */

import { lazy, Suspense, memo } from 'react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
// import { EarningsTableProps } from './types';

// Lazy load the main table component
const EarningsTableRefactored = lazy(() => 
  import('./EarningsTableRefactored').then(module => ({
    default: module.EarningsTableRefactored
  }))
);

// Loading fallback component
const TableLoadingFallback = memo(function TableLoadingFallback() {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Loading earnings data...</p>
          </div>
        </div>
      </div>
    </div>
  );
});

// Error boundary component
const TableErrorFallback = memo(function TableErrorFallback({ 
  error, 
  onRetry 
}: { 
  error: string; 
  onRetry: () => void; 
}) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">
            Failed to load earnings table
          </div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button
            onClick={onRetry}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
});

// Main lazy loading wrapper
export const LazyEarningsTable = memo(function LazyEarningsTable() {
  return (
    <Suspense fallback={<TableLoadingFallback />}>
      <EarningsTableRefactored />
    </Suspense>
  );
});

// Export with error boundary
export { LazyEarningsTable as default };
