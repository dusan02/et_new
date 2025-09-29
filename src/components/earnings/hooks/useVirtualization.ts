/**
 * 🚀 VIRTUALIZATION HOOK
 * Custom hook pre optimalizovanú virtualizáciu tabuľky
 */

import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface UseVirtualizationOptions {
  data: any[];
  itemHeight?: number;
  overscan?: number;
  containerHeight?: number;
}

interface UseVirtualizationReturn {
  parentRef: React.RefObject<HTMLDivElement>;
  virtualizer: any;
  virtualItems: any[];
  totalSize: number;
  scrollToIndex: (index: number) => void;
  scrollToTop: () => void;
}

export function useVirtualization({
  data,
  itemHeight = 60,
  overscan = 10,
  containerHeight = 400
}: UseVirtualizationOptions): UseVirtualizationReturn {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan,
  });

  const virtualItems = useMemo(() => {
    return virtualizer.getVirtualItems();
  }, [virtualizer]);

  const totalSize = virtualizer.getTotalSize();

  const scrollToIndex = (index: number) => {
    virtualizer.scrollToIndex(index, {
      align: 'start',
      behavior: 'smooth'
    });
  };

  const scrollToTop = () => {
    virtualizer.scrollToIndex(0, {
      align: 'start',
      behavior: 'smooth'
    });
  };

  return {
    parentRef,
    virtualizer,
    virtualItems,
    totalSize,
    scrollToIndex,
    scrollToTop
  };
}
