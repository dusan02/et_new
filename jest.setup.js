// Jest setup file
import "@testing-library/jest-dom";

// Mock environment variables
process.env.DATABASE_URL = "file:./test.db";
process.env.FINNHUB_API_KEY = "test-finnhub-key";
process.env.POLYGON_API_KEY = "test-polygon-key";
process.env.NODE_ENV = "test";

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test timeout
jest.setTimeout(30000);
