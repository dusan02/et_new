/**
 * 📊 EARNINGS CONSTANTS
 * Konštanty pre earnings komponenty
 */

import { TableColumn } from './types';

export const TABLE_COLUMNS: TableColumn[] = [
  { key: 'index', label: '#', sortable: false, width: '60px' },
  { key: 'ticker', label: 'Ticker', sortable: true, width: '200px' },
  { key: 'reportTime', label: 'Time', sortable: true, width: '120px' },
  { key: 'size', label: 'Size', sortable: true, width: '100px' },
  { key: 'marketCap', label: 'Market Cap', sortable: true, width: '120px' },
  { key: 'marketCapDiff', label: 'Cap Diff', sortable: true, width: '120px' },
  { key: 'currentPrice', label: 'Price', sortable: true, width: '100px' },
  { key: 'priceChangePercent', label: 'Change', sortable: true, width: '100px' },
  { key: 'epsEstimate', label: 'EPS Est', sortable: true, width: '100px' },
  { key: 'epsActual', label: 'EPS Act', sortable: true, width: '100px' },
  { key: 'epsSurprise', label: 'EPS Surp', sortable: false, width: '100px' },
  { key: 'revenueEstimate', label: 'Rev Est', sortable: true, width: '120px' },
  { key: 'revenueActual', label: 'Rev Act', sortable: true, width: '120px' },
  { key: 'revenueSurprise', label: 'Rev Surp', sortable: false, width: '100px' },
];

export const PERFORMANCE_CONFIG = {
  DEBOUNCE_MS: 300,
  THROTTLE_MS: 100,
  VIRTUAL_ITEM_HEIGHT: 60,
  VIRTUAL_OVERSCAN: 10,
  VIRTUAL_CONTAINER_HEIGHT: 400,
  INTERSECTION_THRESHOLD: 0.1,
  INTERSECTION_ROOT_MARGIN: '50px'
} as const;

export const CACHE_CONFIG = {
  DATA_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  STATS_CACHE_TTL: 2 * 60 * 1000, // 2 minutes
  MAX_CACHE_SIZE: 100
} as const;

export const API_CONFIG = {
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  TIMEOUT: 10000,
  REFRESH_INTERVAL: 30 * 1000 // 30 seconds
} as const;
