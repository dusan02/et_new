import { getTodayDate } from './daily-reset-state';

/**
 * Fallback logic for handling empty earnings data
 * Prevents showing "no earnings today" too early in the day
 */

export interface FetchResult {
  ok: boolean;
  count: number;
  softEmpty?: boolean;
  error?: string;
  data?: any[];
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch earnings with soft confirmation and backoff retries
 * Only confirms "no earnings" after multiple attempts throughout the day
 */
export async function fetchEarningsWithSoftConfirm(
  tradingDateET: string,
  fetchFunction: (date: string) => Promise<FetchResult>,
  maxRetries: number = 3
): Promise<FetchResult> {
  console.log(`🔍 Fetching earnings for ${tradingDateET} with soft confirmation...`);
  
  // First attempt
  const result1 = await fetchFunction(tradingDateET);
  if (result1.ok && result1.count > 0) {
    console.log(`✅ Found ${result1.count} earnings on first attempt`);
    return result1;
  }
  
  console.log(`⚠️ First attempt returned ${result1.count} earnings, trying backoff retries...`);
  
  // Backoff retries with increasing delays
  const delays = [10 * 60 * 1000, 15 * 60 * 1000, 30 * 60 * 1000]; // 10min, 15min, 30min
  
  for (let i = 0; i < Math.min(maxRetries, delays.length); i++) {
    console.log(`⏳ Waiting ${delays[i] / 1000 / 60} minutes before retry ${i + 2}...`);
    await sleep(delays[i]);
    
    const result = await fetchFunction(tradingDateET);
    if (result.ok && result.count > 0) {
      console.log(`✅ Found ${result.count} earnings on retry ${i + 2}`);
      return result;
    }
    
    console.log(`⚠️ Retry ${i + 2} returned ${result.count} earnings`);
  }
  
  // All retries exhausted - return soft empty
  console.log(`🔍 All retries exhausted for ${tradingDateET}, marking as soft empty`);
  return {
    ok: true,
    count: 0,
    softEmpty: true,
    data: []
  };
}

/**
 * Check if we should show "no earnings today" message
 * Only show after 1:00 AM ET the next day
 */
export function shouldShowNoEarningsMessage(
  tradingDateET: string,
  lastFetchAttempt: Date
): boolean {
  const today = getTodayDate();
  const tradingDate = new Date(tradingDateET);
  
  // If trading date is not today, we can safely show "no earnings"
  if (tradingDate.getTime() !== today.getTime()) {
    return true;
  }
  
  // If it's after 1:00 AM ET the next day, show "no earnings"
  const nextDay1AM = new Date(today);
  nextDay1AM.setDate(nextDay1AM.getDate() + 1);
  nextDay1AM.setHours(1, 0, 0, 0);
  
  const now = new Date();
  if (now >= nextDay1AM) {
    return true;
  }
  
  // If last fetch was more than 2 hours ago and still no data, show "no earnings"
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  if (lastFetchAttempt < twoHoursAgo) {
    return true;
  }
  
  return false;
}

/**
 * Get appropriate message for empty earnings state
 */
export function getEmptyEarningsMessage(
  tradingDateET: string,
  lastFetchAttempt: Date,
  isSoftEmpty: boolean = false
): string {
  if (shouldShowNoEarningsMessage(tradingDateET, lastFetchAttempt)) {
    return "No earnings scheduled for today";
  }
  
  if (isSoftEmpty) {
    return "Checking for earnings data...";
  }
  
  return "Preparing today's earnings data...";
}

/**
 * Check if we should retry fetching earnings
 * Based on time of day and previous attempts
 */
export function shouldRetryEarningsFetch(
  tradingDateET: string,
  lastFetchAttempt: Date,
  attemptCount: number
): boolean {
  const today = getTodayDate();
  const tradingDate = new Date(tradingDateET);
  
  // Don't retry if trading date is not today
  if (tradingDate.getTime() !== today.getTime()) {
    return false;
  }
  
  // Don't retry if it's after 1:00 AM ET the next day
  const nextDay1AM = new Date(today);
  nextDay1AM.setDate(nextDay1AM.getDate() + 1);
  nextDay1AM.setHours(1, 0, 0, 0);
  
  const now = new Date();
  if (now >= nextDay1AM) {
    return false;
  }
  
  // Don't retry if we've already tried too many times
  if (attemptCount >= 5) {
    return false;
  }
  
  // Don't retry if last attempt was less than 30 minutes ago
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
  if (lastFetchAttempt > thirtyMinutesAgo) {
    return false;
  }
  
  return true;
}

/**
 * Get next retry time for earnings fetch
 */
export function getNextRetryTime(
  tradingDateET: string,
  lastFetchAttempt: Date,
  attemptCount: number
): Date | null {
  if (!shouldRetryEarningsFetch(tradingDateET, lastFetchAttempt, attemptCount)) {
    return null;
  }
  
  // Progressive backoff: 30min, 1h, 2h, 4h
  const delays = [30, 60, 120, 240]; // minutes
  const delayIndex = Math.min(attemptCount - 1, delays.length - 1);
  const delayMinutes = delays[delayIndex];
  
  const nextRetry = new Date(lastFetchAttempt.getTime() + delayMinutes * 60 * 1000);
  return nextRetry;
}

/**
 * Track earnings fetch attempts
 */
export class EarningsFetchTracker {
  private attempts: Map<string, { count: number; lastAttempt: Date }> = new Map();
  
  recordAttempt(tradingDateET: string): void {
    const existing = this.attempts.get(tradingDateET);
    this.attempts.set(tradingDateET, {
      count: (existing?.count || 0) + 1,
      lastAttempt: new Date()
    });
  }
  
  getAttemptInfo(tradingDateET: string): { count: number; lastAttempt: Date } | null {
    return this.attempts.get(tradingDateET) || null;
  }
  
  shouldRetry(tradingDateET: string): boolean {
    const info = this.getAttemptInfo(tradingDateET);
    if (!info) return true;
    
    return shouldRetryEarningsFetch(tradingDateET, info.lastAttempt, info.count);
  }
  
  getNextRetryTime(tradingDateET: string): Date | null {
    const info = this.getAttemptInfo(tradingDateET);
    if (!info) return null;
    
    return getNextRetryTime(tradingDateET, info.lastAttempt, info.count);
  }
}

// Global tracker instance
export const earningsFetchTracker = new EarningsFetchTracker();
