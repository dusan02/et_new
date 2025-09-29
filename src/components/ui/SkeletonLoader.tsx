'use client';

interface SkeletonLoaderProps {
  type?: 'card' | 'table' | 'text';
  className?: string;
}

export function SkeletonLoader({ type = 'text', className = '' }: SkeletonLoaderProps) {
  const baseClasses = "animate-pulse bg-gray-200 rounded";
  
  if (type === 'card') {
    return (
      <div className={`${baseClasses} p-4 mb-3 h-32 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-6 h-4 bg-gray-300 rounded"></div>
            <div>
              <div className="w-16 h-4 bg-gray-300 rounded mb-1"></div>
              <div className="w-24 h-3 bg-gray-300 rounded"></div>
            </div>
          </div>
          <div className="w-12 h-6 bg-gray-300 rounded-full"></div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="p-2 bg-gray-300 rounded">
            <div className="w-12 h-3 bg-gray-400 rounded mb-1"></div>
            <div className="w-16 h-4 bg-gray-400 rounded"></div>
          </div>
          <div className="p-2 bg-gray-300 rounded">
            <div className="w-12 h-3 bg-gray-400 rounded mb-1"></div>
            <div className="w-16 h-4 bg-gray-400 rounded"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 bg-gray-300 rounded">
            <div className="w-12 h-3 bg-gray-400 rounded mb-1"></div>
            <div className="w-16 h-4 bg-gray-400 rounded"></div>
          </div>
          <div className="p-2 bg-gray-300 rounded">
            <div className="w-12 h-3 bg-gray-400 rounded mb-1"></div>
            <div className="w-16 h-4 bg-gray-400 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (type === 'table') {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 table-fixed border border-gray-300">
          <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
            <tr>
              {Array.from({ length: 13 }).map((_, i) => (
                <th key={i} className="px-2 sm:px-4 py-2 sm:py-3">
                  <div className="w-16 h-4 bg-gray-300 rounded mx-auto"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: 13 }).map((_, colIndex) => (
                  <td key={colIndex} className="px-2 sm:px-4 py-2 sm:py-3">
                    <div className="w-12 h-4 bg-gray-200 rounded"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  
  return (
    <div className={`${baseClasses} w-full h-4 ${className}`}></div>
  );
}

export function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white border border-gray-200 rounded-lg p-3 sm:p-4 md:p-6 min-h-[90px] sm:min-h-[100px] md:min-h-[110px] w-full">
      <div className="h-full flex flex-col justify-between">
        <div className="w-16 h-3 bg-gray-200 rounded mx-auto"></div>
        <div className="w-12 h-4 bg-gray-200 rounded mx-auto"></div>
        <div className="w-20 h-3 bg-gray-200 rounded mx-auto"></div>
      </div>
    </div>
  );
}
