#!/usr/bin/env tsx

/**
 * Smoke test script for performance validation
 */

import axios from 'axios'

interface SmokeTestResult {
  test: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

interface PerformanceMetrics {
  p95: number;
  average: number;
  min: number;
  max: number;
  cacheHitRate: number;
}

class SmokeTester {
  private baseUrl: string;
  private results: SmokeTestResult[] = [];

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  async runTest(testName: string, testFn: () => Promise<any>): Promise<SmokeTestResult> {
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      const testResult: SmokeTestResult = {
        test: testName,
        passed: true,
        duration,
        details: result
      };
      
      this.results.push(testResult);
      console.log(`✅ ${testName}: ${duration}ms`);
      
      return testResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const testResult: SmokeTestResult = {
        test: testName,
        passed: false,
        duration,
        error: (error as Error).message
      };
      
      this.results.push(testResult);
      console.log(`❌ ${testName}: ${duration}ms - ${(error as Error).message}`);
      
      return testResult;
    }
  }

  async testApiEndpoint(endpoint: string, expectedFields: string[] = []): Promise<any> {
    const response = await axios.get(`${this.baseUrl}${endpoint}`, {
      timeout: 10000,
      validateStatus: (status) => status < 500
    });

    if (response.status !== 200) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = response.data;
    
    // Check for required fields
    for (const field of expectedFields) {
      if (!(field in data)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Check for NaN/Infinity values
    this.checkForInvalidNumbers(data);

    return data;
  }

  private checkForInvalidNumbers(obj: any, path: string = ''): void {
    if (obj === null || obj === undefined) return;
    
    if (typeof obj === 'number') {
      if (isNaN(obj) || !isFinite(obj)) {
        throw new Error(`Invalid number found at ${path}: ${obj}`);
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        this.checkForInvalidNumbers(item, `${path}[${index}]`);
      });
    } else if (typeof obj === 'object') {
      Object.entries(obj).forEach(([key, value]) => {
        this.checkForInvalidNumbers(value, path ? `${path}.${key}` : key);
      });
    }
  }

  async testPerformance(endpoint: string, iterations: number = 10): Promise<PerformanceMetrics> {
    const durations: number[] = [];
    let cacheHits = 0;

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      try {
        const response = await axios.get(`${this.baseUrl}${endpoint}`, {
          timeout: 10000
        });
        
        const duration = Date.now() - startTime;
        durations.push(duration);
        
        // Check for cache hit
        if (response.headers['x-cache'] === 'HIT') {
          cacheHits++;
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`Performance test iteration ${i + 1} failed:`, (error as Error).message);
      }
    }

    durations.sort((a, b) => a - b);
    
    return {
      p95: durations[Math.ceil(durations.length * 0.95) - 1] || 0,
      average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      cacheHitRate: (cacheHits / iterations) * 100
    };
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting smoke tests...\n');

    // Test 1: API Health Check
    await this.runTest('API Health Check', async () => {
      return this.testApiEndpoint('/api/earnings', ['date', 'count', 'data']);
    });

    // Test 2: API Stats Endpoint
    await this.runTest('API Stats Endpoint', async () => {
      return this.testApiEndpoint('/api/earnings/stats', ['success']);
    });

    // Test 3: Performance Test (P95 < 500ms)
    await this.runTest('Performance Test (P95 < 500ms)', async () => {
      const metrics = await this.testPerformance('/api/earnings', 10);
      
      if (metrics.p95 > 500) {
        throw new Error(`P95 latency too high: ${metrics.p95}ms (target: <500ms)`);
      }
      
      return metrics;
    });

    // Test 4: Cache Hit Rate (>80%)
    await this.runTest('Cache Hit Rate (>80%)', async () => {
      const metrics = await this.testPerformance('/api/earnings', 20);
      
      if (metrics.cacheHitRate < 80) {
        throw new Error(`Cache hit rate too low: ${metrics.cacheHitRate.toFixed(1)}% (target: >80%)`);
      }
      
      return metrics;
    });

    // Test 5: Data Validation
    await this.runTest('Data Validation', async () => {
      const data = await this.testApiEndpoint('/api/earnings');
      
      if (!Array.isArray(data.data)) {
        throw new Error('Data is not an array');
      }
      
      if (data.data.length === 0) {
        throw new Error('No data returned');
      }
      
      // Check first record structure
      const firstRecord = data.data[0];
      const requiredFields = ['ticker', 'companyName'];
      
      for (const field of requiredFields) {
        if (!(field in firstRecord)) {
          throw new Error(`Missing field in data record: ${field}`);
        }
      }
      
      return {
        recordCount: data.data.length,
        sampleRecord: firstRecord
      };
    });

    // Test 6: Frontend Page Load
    await this.runTest('Frontend Page Load', async () => {
      const response = await axios.get(`${this.baseUrl}/`, {
        timeout: 10000,
        validateStatus: (status) => status < 500
      });
      
      if (response.status !== 200) {
        throw new Error(`Frontend returned ${response.status}: ${response.statusText}`);
      }
      
      if (!response.data.includes('Earnings')) {
        throw new Error('Frontend page does not contain expected content');
      }
      
      return {
        status: response.status,
        contentLength: response.data.length
      };
    });

    this.printSummary();
  }

  private printSummary(): void {
    console.log('\n📊 Test Summary:');
    console.log('================');
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Average Duration: ${(totalDuration / this.results.length).toFixed(1)}ms`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  - ${r.test}: ${r.error}`);
        });
    }
    
    console.log('\n🎯 Performance Targets:');
    console.log('  - P95 Latency: <500ms');
    console.log('  - Cache Hit Rate: >80%');
    console.log('  - Data Validation: All fields present');
    console.log('  - Frontend Load: <10s');
    
    if (failed === 0) {
      console.log('\n🎉 All tests passed! Performance targets met.');
    } else {
      console.log('\n⚠️  Some tests failed. Check the details above.');
      process.exit(1);
    }
  }
}

// Run smoke tests if called directly
if (require.main === module) {
  const tester = new SmokeTester();
  tester.runAllTests().catch(error => {
    console.error('Smoke test runner failed:', error);
    process.exit(1);
  });
}

export { SmokeTester };
