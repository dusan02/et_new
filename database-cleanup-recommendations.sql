-- Database Cleanup Recommendations
-- Generated on: 2025-10-08T12:27:16.016Z

DELETE FROM EarningsTickersToday WHERE reportDate < date('now', '-7 days');
DELETE FROM MarketData WHERE reportDate < date('now', '-7 days');
DELETE FROM DailyResetState WHERE date < date('now', '-30 days');
