/**
 * Optimized API fetchers with batch processing and retry logic
 */

interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

interface BatchFetchOptions {
  batchSize: number;
  delayBetweenBatches: number;
  retryOptions: RetryOptions;
}

interface FetchResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  retryCount: number;
}

/**
 * Exponential backoff retry logic
 */
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<FetchResult<T>> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      const data = await fn();
      return {
        success: true,
        data,
        retryCount: attempt
      };
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === options.maxRetries) {
        break;
      }
      
      // Exponential backoff with jitter
      const delay = Math.min(
        options.baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        options.maxDelay
      );
      
      console.log(`[RETRY] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
      await sleep(delay);
    }
  }
  
  return {
    success: false,
    error: lastError?.message || 'Unknown error',
    retryCount: options.maxRetries
  };
}

/**
 * Batch fetch with Promise.allSettled for resilience
 */
export async function batchFetch<T>(
  items: string[],
  fetchFn: (item: string) => Promise<T>,
  options: BatchFetchOptions
): Promise<FetchResult<T>[]> {
  const results: FetchResult<T>[] = [];
  
  // Split items into batches
  const batches: string[][] = [];
  for (let i = 0; i < items.length; i += options.batchSize) {
    batches.push(items.slice(i, i + options.batchSize));
  }
  
  console.log(`[BATCH] Processing ${items.length} items in ${batches.length} batches of ${options.batchSize}`);
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    console.log(`[BATCH] Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} items`);
    
    // Process batch with Promise.allSettled for resilience
    const batchPromises = batch.map(async (item) => {
      return retryWithBackoff(() => fetchFn(item), options.retryOptions);
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Process results
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          error: result.reason?.message || 'Promise rejected',
          retryCount: 0
        });
      }
    });
    
    // Log batch metrics
    const successful = batchResults.filter(r => r.status === 'fulfilled').length;
    const failed = batchResults.length - successful;
    console.log(`[BATCH] Batch ${batchIndex + 1} completed: ${successful} successful, ${failed} failed`);
    
    // Delay between batches to avoid rate limiting
    if (batchIndex < batches.length - 1) {
      await sleep(options.delayBetweenBatches);
    }
  }
  
  // Log overall metrics
  const totalSuccessful = results.filter(r => r.success).length;
  const totalFailed = results.length - totalSuccessful;
  const totalRetries = results.reduce((sum, r) => sum + r.retryCount, 0);
  
  console.log(`[BATCH] Overall results: ${totalSuccessful} successful, ${totalFailed} failed, ${totalRetries} total retries`);
  
  return results;
}

/**
 * Polygon API batch fetcher for market data
 */
export async function batchFetchPolygonData(
  tickers: string[],
  apiKey: string
): Promise<FetchResult<any>[]> {
  const fetchSingleTicker = async (ticker: string) => {
    const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}?apikey=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Polygon API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  };
  
  return batchFetch(tickers, fetchSingleTicker, {
    batchSize: 15, // Polygon allows 5 calls per second, so 15 per 3 seconds
    delayBetweenBatches: 3000, // 3 seconds between batches
    retryOptions: {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000
    }
  });
}

/**
 * Finnhub API batch fetcher for earnings data
 */
export async function batchFetchFinnhubData(
  tickers: string[],
  apiKey: string,
  date: string
): Promise<FetchResult<any>[]> {
  const fetchSingleTicker = async (ticker: string) => {
    const url = `https://finnhub.io/api/v1/calendar/earnings?symbol=${ticker}&from=${date}&to=${date}&token=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  };
  
  return batchFetch(tickers, fetchSingleTicker, {
    batchSize: 10, // Finnhub allows 60 calls per minute, so 10 per 10 seconds
    delayBetweenBatches: 10000, // 10 seconds between batches
    retryOptions: {
      maxRetries: 3,
      baseDelay: 2000,
      maxDelay: 15000
    }
  });
}

/**
 * Benzinga API batch fetcher for guidance data
 */
export async function batchFetchBenzingaData(
  tickers: string[],
  apiKey: string
): Promise<FetchResult<any>[]> {
  const fetchSingleTicker = async (ticker: string) => {
    const url = `https://api.benzinga.com/api/v2.1/calendar/earnings?symbols=${ticker}&token=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Benzinga API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  };
  
  return batchFetch(tickers, fetchSingleTicker, {
    batchSize: 5, // Benzinga has stricter rate limits
    delayBetweenBatches: 5000, // 5 seconds between batches
    retryOptions: {
      maxRetries: 2,
      baseDelay: 3000,
      maxDelay: 20000
    }
  });
}

/**
 * Utility to extract successful results from batch fetch
 */
export function extractSuccessfulResults<T>(results: FetchResult<T>[]): T[] {
  return results
    .filter(result => result.success && result.data)
    .map(result => result.data!);
}

/**
 * Utility to extract failed results for logging
 */
export function extractFailedResults<T>(results: FetchResult<T>[]): { ticker: string; error: string }[] {
  return results
    .filter(result => !result.success)
    .map((result, index) => ({
      ticker: `ticker_${index}`, // You might want to pass the actual ticker
      error: result.error || 'Unknown error'
    }));
}
