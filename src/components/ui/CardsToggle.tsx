'use client';

import { Grid3X3, Eye, EyeOff, CreditCard } from 'lucide-react';

interface CardsToggleProps {
  isVisible: boolean;
  onToggle?: (isVisible: boolean) => void;
}

export function CardsToggle({ isVisible, onToggle }: CardsToggleProps) {
  const handleToggle = () => {
    const newVisibility = !isVisible;
    onToggle?.(newVisibility);
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center justify-center rounded-lg border transition-all duration-200 hover:scale-105 ${
        isVisible 
          ? 'bg-white border-blue-300 shadow-md' 
          : 'bg-white border-gray-300 shadow-sm'
      }`}
      title={isVisible ? 'Hide stats cards' : 'Show stats cards'}
    >
      <div className="p-2">
        <CreditCard 
          className={`h-4 w-4 transition-colors duration-200 ${
            isVisible 
              ? 'text-blue-600' 
              : 'text-gray-500'
          }`} 
          aria-hidden="true" 
        />
      </div>
    </button>
  );
}
