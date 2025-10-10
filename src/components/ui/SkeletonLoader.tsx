import React from 'react';

export function SkeletonCard() {
  return (
    <div className="p-4 rounded-lg border-2 bg-gray-100 dark:bg-gray-800 animate-pulse">
      <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
      <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
    </div>
  );
}