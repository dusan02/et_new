#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { logger } from '../src/lib/logger';
import { MarketDataRetryService } from '../src/modules/market-data/services/market-data-retry.service';
import { retryWithBackoff, batchRetryWithBackoff, logFailedTickers, checkSuccessRate } from '../src/lib/market-data-retry';

// Load environment variables
config();

/**
 * Enhanced market data fetch with retry logic and error handling
 */
async function fetchMarketDataEnhanced(): Promise<void> {
  try {
    logger.info('Starting enhanced market data fetch');

    const marketDataService = new MarketDataRetryService();
    
    // Get today's date in NY timezone
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const today = new Date(Date.UTC(easternTime.getFullYear(), easternTime.getMonth(), easternTime.getDate()));
    
    logger.info('Fetching market data for date', { 
      date: today.toISOString().slice(0, 10) 
    });

    // Simulate market data fetch (in real implementation, this would call Polygon API)
    const mockMarketData = await generateMockMarketData(today);
    
    // Process with enhanced retry logic
    const result = await marketDataService.processMarketDataWithRetry(mockMarketData, today);
    
    // Log results
    logger.info('Enhanced market data fetch completed', {
      totalTickers: Object.keys(mockMarketData).length,
      successful: result.ok,
      failed: result.failed,
      successRate: result.successRate,
      failedTickers: result.failedTickers.length
    });

    // Check if success rate meets threshold
    const successRateCheck = checkSuccessRate(result.ok, Object.keys(mockMarketData).length, 70);
    
    if (!successRateCheck.meetsThreshold) {
      logger.error('Market data success rate below threshold', {
        successRate: successRateCheck.rate,
        threshold: 70,
        message: successRateCheck.message
      });
      
      // In production, this would trigger alerts
      console.error(`❌ Market data fetch failed: ${successRateCheck.message}`);
      process.exit(1);
    }

    // Log failed tickers for analysis
    if (result.failedTickers.length > 0) {
      logFailedTickers(result.failedTickers, `marketdata-errors-${today.toISOString().slice(0, 10)}.log`);
    }

    console.log('✅ Enhanced market data fetch completed successfully!');
    console.log(`📊 Processed ${Object.keys(mockMarketData).length} tickers`);
    console.log(`✅ Successful: ${result.ok}`);
    console.log(`❌ Failed: ${result.failed}`);
    console.log(`📈 Success Rate: ${result.successRate.toFixed(1)}%`);

  } catch (error) {
    logger.error('Enhanced market data fetch failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    console.error('❌ Enhanced market data fetch failed:', error);
    process.exit(1);
  }
}

/**
 * Generate mock market data for testing
 * In production, this would be replaced with actual Polygon API calls
 */
async function generateMockMarketData(reportDate: Date): Promise<Record<string, any>> {
  // This is a simplified mock - in production you'd call Polygon API
  const mockTickers = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX',
    'ANVI', 'APLD', 'APOG', 'AXIL', 'BKSC', 'BYRN', 'CAUD', 'CLSH',
    'CNBB', 'DAL', 'EDUC', 'FRMO', 'HELE', 'HIHO', 'LEVI', 'NAAS'
  ];

  const mockData: Record<string, any> = {};
  
  for (const ticker of mockTickers) {
    // Simulate some tickers failing (404 errors)
    if (['CLSH', 'CNBB', 'ANVI'].includes(ticker)) {
      // These will fail to simulate 404 errors
      continue;
    }
    
    mockData[ticker] = {
      currentPrice: Math.random() * 500 + 10,
      previousClose: Math.random() * 500 + 10,
      sharesOutstanding: Math.floor(Math.random() * 1000000000) + 1000000,
      companyName: `${ticker} Inc.`,
      companyType: 'Public',
      primaryExchange: Math.random() > 0.5 ? 'NASDAQ' : 'NYSE'
    };
  }
  
  return mockData;
}

/**
 * Validate tickers before fetching market data
 */
async function validateTickers(tickers: string[]): Promise<{
  valid: string[];
  invalid: string[];
}> {
  const marketDataService = new MarketDataRetryService();
  const valid: string[] = [];
  const invalid: string[] = [];
  
  for (const ticker of tickers) {
    const validation = await marketDataService.validateTicker(ticker);
    if (validation.isValid && validation.isActive) {
      valid.push(ticker);
    } else {
      invalid.push(ticker);
      logger.warn('Invalid ticker detected', {
        ticker,
        reason: validation.reason
      });
    }
  }
  
  return { valid, invalid };
}

/**
 * Get market data health status
 */
async function getMarketDataHealth(): Promise<void> {
  try {
    const marketDataService = new MarketDataRetryService();
    const health = await marketDataService.getHealthStatus();
    
    console.log('📊 Market Data Health Status:');
    console.log(`Status: ${health.status}`);
    console.log(`Total Records: ${health.metrics.totalRecords}`);
    console.log(`Success Rate: ${health.metrics.recentSuccessRate.toFixed(1)}%`);
    console.log(`Last Update: ${health.metrics.lastUpdate || 'Never'}`);
    
    if (health.issues.length > 0) {
      console.log('⚠️ Issues:');
      health.issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
  } catch (error) {
    console.error('❌ Failed to get health status:', error);
  }
}

// Run if called directly
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'fetch':
      fetchMarketDataEnhanced();
      break;
    case 'health':
      getMarketDataHealth();
      break;
    default:
      console.log('Usage: npm run fetch:market:enhanced [fetch|health]');
      console.log('  fetch  - Fetch market data with retry logic');
      console.log('  health - Check market data health status');
      process.exit(1);
  }
}

export { fetchMarketDataEnhanced, getMarketDataHealth, validateTickers };
