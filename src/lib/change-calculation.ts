/**
 * Safe change calculation utilities
 * Prevents showing 0% change when data is missing or invalid
 */

/**
 * Calculate percentage change between two values
 * Returns null if inputs are invalid (not 0%)
 */
export function computeChange(
  currentValue?: number | null, 
  previousValue?: number | null
): number | null {
  // Return null if any input is missing or invalid
  if (currentValue == null || previousValue == null) {
    return null;
  }
  
  // Return null if previous value is zero or negative
  if (previousValue <= 0) {
    return null;
  }
  
  // Calculate percentage change
  const change = (currentValue / previousValue - 1) * 100;
  
  // Return null if result is NaN or infinite
  if (!isFinite(change)) {
    return null;
  }
  
  return change;
}

/**
 * Calculate price change percentage
 * Specialized for stock prices
 */
export function computePriceChange(
  currentPrice?: number | null,
  previousClose?: number | null
): number | null {
  return computeChange(currentPrice, previousClose);
}

/**
 * Calculate market cap change
 * Specialized for market capitalization
 */
export function computeMarketCapChange(
  currentMarketCap?: number | null,
  previousMarketCap?: number | null
): number | null {
  return computeChange(currentMarketCap, previousMarketCap);
}

/**
 * Format change percentage for display
 * Returns formatted string or "N/A" for null values
 */
export function formatChangePercentage(change: number | null): string {
  if (change === null) {
    return "N/A";
  }
  
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
}

/**
 * Get change color class for UI
 * Returns CSS class name based on change value
 */
export function getChangeColorClass(change: number | null): string {
  if (change === null) {
    return "text-gray-500"; // Neutral for missing data
  }
  
  if (change > 0) {
    return "text-green-600"; // Positive change
  } else if (change < 0) {
    return "text-red-600"; // Negative change
  } else {
    return "text-gray-500"; // No change
  }
}

/**
 * Validate if change calculation is meaningful
 * Returns true if change should be displayed to user
 */
export function isChangeMeaningful(change: number | null): boolean {
  if (change === null) {
    return false;
  }
  
  // Consider changes less than 0.01% as not meaningful
  return Math.abs(change) >= 0.01;
}

/**
 * Calculate change with confidence level
 * Returns change with metadata about data quality
 */
export function computeChangeWithConfidence(
  currentValue?: number | null,
  previousValue?: number | null
): {
  change: number | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  reason?: string;
} {
  // No data
  if (currentValue == null || previousValue == null) {
    return {
      change: null,
      confidence: 'none',
      reason: 'Missing current or previous value'
    };
  }
  
  // Invalid previous value
  if (previousValue <= 0) {
    return {
      change: null,
      confidence: 'none',
      reason: 'Invalid previous value (zero or negative)'
    };
  }
  
  const change = computeChange(currentValue, previousValue);
  
  if (change === null) {
    return {
      change: null,
      confidence: 'none',
      reason: 'Calculation resulted in invalid value'
    };
  }
  
  // Determine confidence based on data quality
  const absChange = Math.abs(change);
  
  if (absChange < 0.01) {
    return {
      change,
      confidence: 'low',
      reason: 'Very small change, may be due to rounding'
    };
  } else if (absChange < 1) {
    return {
      change,
      confidence: 'medium',
      reason: 'Small change'
    };
  } else {
    return {
      change,
      confidence: 'high',
      reason: 'Significant change'
    };
  }
}
