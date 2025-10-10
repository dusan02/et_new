import React from 'react';

interface StatCardProps {
  title: string;
  main: string | number;
  sub: string | number;
  variant: 'blue' | 'green' | 'red';
  onClick?: () => void;
}

export default function StatCard({ title, main, sub, variant, onClick }: StatCardProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'blue':
        return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200';
      case 'green':
        return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200';
      case 'red':
        return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div 
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${getVariantClasses()}`}
      onClick={onClick}
    >
      <div className="text-xs font-medium uppercase tracking-wider mb-1">
        {title}
      </div>
      <div className="text-lg font-bold mb-1">
        {main}
      </div>
      <div className="text-sm opacity-75">
        {sub}
      </div>
    </div>
  );
}