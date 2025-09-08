'use client';

import { Clock, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

interface HeaderProps {
  lastUpdated: Date | null;
}

export function Header({ lastUpdated }: HeaderProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Update date every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200" role="banner">
      <div className="flex py-6">
        {/* Left spacer - 15% */}
        <div className="w-[15%]"></div>
        
        {/* Main content - 70% */}
        <div className="w-[70%] px-4">
          <div className="text-left">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
              EARNINGS TABLE
            </h1>
            <time 
              className="text-lg text-gray-600 mt-2 block" 
              dateTime={currentDate.toISOString()}
              aria-label={`Current date: ${currentDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}`}
            >
              {currentDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1" aria-live="polite" aria-label="Auto refresh status">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span>Autorefresh update every minute</span>
            </div>
          </div>
        </div>
        
        {/* Right spacer - 15% */}
        <div className="w-[15%]"></div>
      </div>
    </header>
  );
}



