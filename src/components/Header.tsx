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
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
              EARNINGS TABLE
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <time 
                className="text-lg text-gray-600" 
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
              <div className="flex items-center gap-2 text-sm text-gray-500" role="img" aria-label="Earnings dashboard icon">
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span>Earnings Dashboard</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500" aria-live="polite" aria-label="Auto refresh status">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span>Autorefresh</span>
            </div>
            
            <div className="flex items-center gap-2" aria-label="Data update frequency">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" aria-hidden="true" role="img" aria-label="Live data indicator"></div>
              <span className="text-sm text-gray-600">update every minute</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}


