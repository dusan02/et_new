/**
 * Boot state management for preventing "no earnings" during bootstrap
 * Ensures frontend never shows stale data while system is initializing
 */

export type BootState = 
  | "00_PENDING"           // Initial state, no data loaded
  | "10_CALENDAR_READY"    // Earnings calendar loaded
  | "20_PREVCLOSE_READY"   // Previous close prices loaded
  | "30_PREMARKET_READY"   // Pre-market data loaded
  | "40_METRICS_READY"     // All metrics calculated
  | "50_CACHE_WARMED"      // Cache warmed up
  | "60_PUBLISHED";        // Ready to serve to frontend

let _state: BootState = "00_PENDING";
let _lastUpdated: Date = new Date();

/**
 * Set the current boot state
 */
export function setBootState(state: BootState): void {
  _state = state;
  _lastUpdated = new Date();
  console.log(`🚀 Boot state: ${state} (${_lastUpdated.toISOString()})`);
}

/**
 * Get the current boot state
 */
export function getBootState(): BootState {
  return _state;
}

/**
 * Get when the state was last updated
 */
export function getBootStateLastUpdated(): Date {
  return _lastUpdated;
}

/**
 * Check if system is ready to serve data to frontend
 */
export function isSystemReady(): boolean {
  return _state === "60_PUBLISHED";
}

/**
 * Check if system is in a transitional state (should show loading)
 */
export function isSystemTransitioning(): boolean {
  return _state !== "60_PUBLISHED" && _state !== "00_PENDING";
}

/**
 * Get human-readable description of current state
 */
export function getBootStateDescription(): string {
  const descriptions: Record<BootState, string> = {
    "00_PENDING": "System starting up...",
    "10_CALENDAR_READY": "Loading earnings calendar...",
    "20_PREVCLOSE_READY": "Loading market data...",
    "30_PREMARKET_READY": "Processing pre-market data...",
    "40_METRICS_READY": "Calculating metrics...",
    "50_CACHE_WARMED": "Warming up cache...",
    "60_PUBLISHED": "System ready"
  };
  
  return descriptions[_state];
}

/**
 * Reset boot state (for testing or manual reset)
 */
export function resetBootState(): void {
  _state = "00_PENDING";
  _lastUpdated = new Date();
  console.log("🔄 Boot state reset to PENDING");
}
