'use client';

import { useState } from 'react';
import { Grid3X3, Eye, EyeOff } from 'lucide-react';

interface CardsToggleProps {
  onToggle?: (isVisible: boolean) => void;
}

export function CardsToggle({ onToggle }: CardsToggleProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleToggle = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    onToggle?.(newVisibility);
  };

  return (
    <button
      onClick={handleToggle}
      className="flex items-center gap-1.5 sm:gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 border border-blue-200 dark:border-blue-800 shadow-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200"
      title={isVisible ? 'Hide stats cards' : 'Show stats cards'}
    >
      {isVisible ? (
        <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
      ) : (
        <EyeOff className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
      )}
      <span className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">
        {isVisible ? 'Cards' : 'Cards'}
      </span>
    </button>
  );
}
