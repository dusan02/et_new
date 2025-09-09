# 🧪 Testing Guide - Earnings Table Application

## 📋 Overview

This document provides a comprehensive guide to testing the Earnings Table application's data flow from cron jobs to frontend rendering.

## 🎯 Test Coverage

### **1. 🕐 Cron Job Tests** (`src/__tests__/cron.test.js`)

- ✅ Cron script startup and execution
- ✅ Initial data fetch execution
- ✅ Error handling and recovery
- ✅ Process management

### **2. 🌐 API Calls Tests** (`src/__tests__/api-calls.test.js`)

- ✅ Finnhub API earnings data
- ✅ Polygon API market data
- ✅ Polygon API ticker details
- ✅ Benzinga API guidance data
- ✅ API error handling
- ✅ Rate limiting

### **3. 🗄️ Database Tests** (`src/__tests__/database.test.js`)

- ✅ EarningsTickersToday operations
- ✅ TodayEarningsMovements operations
- ✅ BenzingaGuidance operations
- ✅ BigInt handling
- ✅ Data validation
- ✅ Transaction handling

### **4. 🌐 API Endpoints Tests** (`src/__tests__/api-endpoints.test.js`)

- ✅ /api/earnings GET endpoint
- ✅ /api/earnings/stats GET endpoint
- ✅ Response format validation
- ✅ Error handling
- ✅ Performance metrics

### **5. 🎨 Frontend Tests** (`src/__tests__/frontend.test.js`)

- ✅ EarningsTable component rendering
- ✅ EarningsStats component rendering
- ✅ StatCard component rendering
- ✅ Data formatting
- ✅ Responsive design
- ✅ Loading and error states

### **6. 🔄 Integration Tests** (`src/__tests__/integration.test.js`)

- ✅ End-to-end data flow
- ✅ Data consistency across layers
- ✅ Error recovery
- ✅ Performance testing
- ✅ Security testing
- ✅ Data validation

## 🚀 Running Tests

### **Run All Tests**

```bash
npm run test:all
```

### **Run Individual Test Suites**

```bash
# Cron job tests
npm run test:cron

# API calls tests
npm run test:api

# Database tests
npm run test:database

# API endpoints tests
npm run test:endpoints

# Frontend tests
npm run test:frontend

# Integration tests
npm run test:integration
```

### **Run Tests in Watch Mode**

```bash
npm run test:watch
```

### **Run Specific Test File**

```bash
npx jest src/__tests__/cron.test.js
```

## 📊 Test Data Objects

### **Price Data**

| Object         | Source     | API Field       | DB Field             | Validation       |
| -------------- | ---------- | --------------- | -------------------- | ---------------- |
| Current Price  | Polygon    | `results[0].c`  | `currentPrice`       | Not null, > 0    |
| Previous Close | Polygon    | `results[0].o`  | `previousClose`      | Not null, > 0    |
| Price Change % | Calculated | `((c-o)/o)*100` | `priceChangePercent` | Valid percentage |

### **Market Cap Data**

| Object              | Source     | API Field                           | DB Field            | Validation       |
| ------------------- | ---------- | ----------------------------------- | ------------------- | ---------------- |
| Market Cap          | Polygon    | `shares * price`                    | `marketCap`         | Not null, > 0    |
| Shares Outstanding  | Polygon    | `ticker_details.shares_outstanding` | `sharesOutstanding` | Not null, > 0    |
| Market Cap Diff     | Calculated | `(new-old)/old*100`                 | `marketCapDiff`     | Valid percentage |
| Size Classification | Calculated | Logic based on cap                  | `size`              | Large/Mid/Small  |

### **EPS Data**

| Object       | Source     | API Field                          | DB Field      | Validation       |
| ------------ | ---------- | ---------------------------------- | ------------- | ---------------- |
| EPS Estimate | Finnhub    | `earningsCalendar[].epsEstimate`   | `epsEstimate` | Valid float      |
| EPS Actual   | Finnhub    | `earningsCalendar[].epsActual`     | `epsActual`   | Valid float      |
| EPS Surprise | Calculated | `((actual-estimate)/estimate)*100` | Calculated    | Valid percentage |

### **Revenue Data**

| Object           | Source     | API Field                            | DB Field          | Validation       |
| ---------------- | ---------- | ------------------------------------ | ----------------- | ---------------- |
| Revenue Estimate | Finnhub    | `earningsCalendar[].revenueEstimate` | `revenueEstimate` | Valid BigInt     |
| Revenue Actual   | Finnhub    | `earningsCalendar[].revenueActual`   | `revenueActual`   | Valid BigInt     |
| Revenue Surprise | Calculated | `((actual-estimate)/estimate)*100`   | Calculated        | Valid percentage |

### **Guidance Data**

| Object            | Source     | API Field                            | DB Field                   | Validation       |
| ----------------- | ---------- | ------------------------------------ | -------------------------- | ---------------- |
| EPS Guidance      | Benzinga   | `estimated_eps_guidance`             | `estimatedEpsGuidance`     | Valid float      |
| Revenue Guidance  | Benzinga   | `estimated_revenue_guidance`         | `estimatedRevenueGuidance` | Valid BigInt     |
| Fiscal Period     | Benzinga   | `fiscal_period`                      | `fiscalPeriod`             | Q1/Q2/Q3/Q4/FY   |
| Fiscal Year       | Benzinga   | `fiscal_year`                        | `fiscalYear`               | Valid year       |
| Guidance Surprise | Calculated | `((guidance-estimate)/estimate)*100` | Calculated                 | Valid percentage |

## 🔧 Test Configuration

### **Jest Configuration** (`jest.config.js`)

```javascript
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "node",
  testMatch: [
    "**/__tests__/**/*.(js|jsx|ts|tsx)",
    "**/*.(test|spec).(js|jsx|ts|tsx)",
  ],
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "scripts/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.{js,jsx,ts,tsx}",
  ],
  moduleNameMapping: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testTimeout: 30000,
  verbose: true,
};

module.exports = createJestConfig(customJestConfig);
```

### **Test Setup** (`jest.setup.js`)

```javascript
import "@testing-library/jest-dom";

// Mock environment variables
process.env.DATABASE_URL = "file:./test.db";
process.env.FINNHUB_API_KEY = "test-finnhub-key";
process.env.POLYGON_API_KEY = "test-polygon-key";
process.env.NODE_ENV = "test";

// Mock console methods
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.setTimeout(30000);
```

## 📈 Test Scenarios

### **Scenario 1: Complete Data Flow**

1. Start cron job
2. Verify API calls
3. Verify database storage
4. Verify API endpoint
5. Verify frontend display

### **Scenario 2: Error Handling**

1. Simulate API errors
2. Verify fallback mechanisms
3. Verify error logging
4. Verify recovery

### **Scenario 3: Data Validation**

1. Verify all numeric values
2. Verify dates and times
3. Verify string validation
4. Verify business logic

## 🚨 Common Issues and Solutions

### **Issue: Tests fail with "Cannot find module"**

**Solution:** Ensure all dependencies are installed:

```bash
npm install
```

### **Issue: Database connection errors in tests**

**Solution:** Check test database configuration in `jest.setup.js`

### **Issue: API mocking not working**

**Solution:** Verify mock setup in test files and ensure proper Jest configuration

### **Issue: Integration tests timeout**

**Solution:** Increase timeout in test files or check if services are running properly

## 📊 Test Results Interpretation

### **Success Criteria**

- ✅ All test suites pass
- ✅ No critical errors
- ✅ Performance within acceptable limits
- ✅ Data consistency maintained

### **Failure Analysis**

- ❌ Check specific test failures
- ❌ Review error logs
- ❌ Verify test data
- ❌ Check environment configuration

## 🔄 Continuous Integration

### **GitHub Actions** (Recommended)

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: "20"
      - run: npm install
      - run: npm run test:all
```

## 📝 Best Practices

1. **Write tests before implementing features**
2. **Use descriptive test names**
3. **Mock external dependencies**
4. **Test error scenarios**
5. **Maintain test data consistency**
6. **Regular test maintenance**
7. **Monitor test performance**

## 🎯 Next Steps

1. **Run all tests** to verify current state
2. **Fix any failing tests**
3. **Add new tests for new features**
4. **Monitor test coverage**
5. **Optimize test performance**

---

**Happy Testing! 🧪✨**
