'use client';

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 bg-gray-200 rounded"></div>
          <div>
            <div className="h-5 bg-gray-200 rounded w-16 mb-1"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
        <div className="w-12 h-6 bg-gray-200 rounded-full"></div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
          <div className="h-5 bg-gray-200 rounded w-20"></div>
        </div>
        <div>
          <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
          <div className="h-5 bg-gray-200 rounded w-16"></div>
        </div>
        <div>
          <div className="h-3 bg-gray-200 rounded w-12 mb-1"></div>
          <div className="h-5 bg-gray-200 rounded w-20"></div>
        </div>
        <div>
          <div className="h-3 bg-gray-200 rounded w-20 mb-1"></div>
          <div className="h-5 bg-gray-200 rounded w-16"></div>
        </div>
      </div>

      {/* Bottom section */}
      <div className="border-t border-gray-100 pt-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="h-3 bg-gray-200 rounded w-8 mb-2"></div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-6"></div>
                <div className="h-3 bg-gray-200 rounded w-10"></div>
              </div>
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-6"></div>
                <div className="h-3 bg-gray-200 rounded w-12"></div>
              </div>
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-8"></div>
                <div className="h-3 bg-gray-200 rounded w-10"></div>
              </div>
            </div>
          </div>
          <div>
            <div className="h-3 bg-gray-200 rounded w-12 mb-2"></div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-6"></div>
                <div className="h-3 bg-gray-200 rounded w-8"></div>
              </div>
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-6"></div>
                <div className="h-3 bg-gray-200 rounded w-10"></div>
              </div>
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-8"></div>
                <div className="h-3 bg-gray-200 rounded w-12"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden animate-pulse">
      {/* Header */}
      <div className="bg-blue-100 border-b border-gray-300 px-4 py-3">
        <div className="flex justify-between">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-300 rounded w-16"></div>
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {Array.from({ length: 8 }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b border-gray-100 px-4 py-3">
          <div className="flex justify-between">
            {Array.from({ length: 6 }).map((_, colIndex) => (
              <div key={colIndex} className={`h-4 bg-gray-200 rounded ${
                colIndex === 0 ? 'w-12' : 
                colIndex === 1 ? 'w-16' : 
                colIndex === 2 ? 'w-32' : 'w-20'
              }`}></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
