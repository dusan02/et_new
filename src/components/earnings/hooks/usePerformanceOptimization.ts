/**
 * 🚀 PERFORMANCE OPTIMIZATION HOOK
 * Custom hook pre performance optimalizácie
 */

import { useMemo, useCallback, useRef, useEffect, useState } from 'react';

interface UsePerformanceOptimizationOptions {
  data: any[];
  dependencies?: any[];
}

interface UsePerformanceOptimizationReturn {
  memoizedData: any[];
  debouncedCallback: (callback: () => void, delay?: number) => void;
  throttledCallback: (callback: () => void, delay?: number) => void;
  isVisible: boolean;
  intersectionRef: React.RefObject<HTMLElement>;
}

export function usePerformanceOptimization({
  data,
  dependencies = []
}: UsePerformanceOptimizationOptions): UsePerformanceOptimizationReturn {
  const [isVisible, setIsVisible] = useState(false);
  const intersectionRef = useRef<HTMLElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const throttleTimeoutRef = useRef<NodeJS.Timeout>();

  // Memoized data processing
  const memoizedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      // Pre-compute expensive calculations
      formattedPrice: item.currentPrice ? `$${item.currentPrice.toFixed(2)}` : 'N/A',
      formattedMarketCap: item.marketCap ? formatMarketCap(item.marketCap) : 'N/A',
      formattedChange: item.priceChangePercent ? `${item.priceChangePercent.toFixed(2)}%` : 'N/A',
      changeColor: getChangeColor(item.priceChangePercent),
      surpriseColor: getSurpriseColor(calculateSurprise(item.epsActual, item.epsEstimate))
    }));
  }, [data, ...dependencies]);

  // Debounced callback
  const debouncedCallback = useCallback((callback: () => void, delay: number = 300) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      callback();
    }, delay);
  }, []);

  // Throttled callback
  const throttledCallback = useCallback((callback: () => void, delay: number = 100) => {
    if (throttleTimeoutRef.current) {
      return;
    }
    
    callback();
    
    throttleTimeoutRef.current = setTimeout(() => {
      throttleTimeoutRef.current = undefined;
    }, delay);
  }, []);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    if (intersectionRef.current) {
      observer.observe(intersectionRef.current);
    }

    return () => {
      if (intersectionRef.current) {
        observer.unobserve(intersectionRef.current);
      }
    };
  }, []);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, []);

  return {
    memoizedData,
    debouncedCallback,
    throttledCallback,
    isVisible,
    intersectionRef
  };
}

// Helper functions
function formatMarketCap(value: number): string {
  const billions = value / 1_000_000_000;
  if (billions >= 1000) {
    return `$${(billions / 1000).toFixed(1)}T`;
  } else if (billions >= 1) {
    return `$${billions.toFixed(1)}B`;
  } else {
    const millions = value / 1_000_000;
    return `$${millions.toFixed(0)}M`;
  }
}

function getChangeColor(value: number | null): string {
  if (value === null || value === undefined) return 'text-gray-500';
  if (value > 0) return 'text-green-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-500';
}

function getSurpriseColor(value: number | null): string {
  if (value === null || value === undefined) return 'text-gray-500';
  if (value > 0) return 'text-green-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-500';
}

function calculateSurprise(actual: number | null, estimate: number | null): number | null {
  if (actual === null || estimate === null || estimate === 0) return null;
  return ((actual - estimate) / Math.abs(estimate)) * 100;
}
