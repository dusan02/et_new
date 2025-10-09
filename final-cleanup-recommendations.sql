-- Final Database Cleanup Recommendations
-- Generated on: 2025-10-08T12:28:33.951Z
-- Analysis: 7 tables, 35 old records found

DELETE FROM EarningsTickersToday WHERE reportDate < date('now', '-7 days'); -- Remove 22 old records
DELETE FROM MarketData WHERE reportDate < date('now', '-7 days'); -- Remove 9 old records
DELETE FROM DailyResetState WHERE date < date('now', '-30 days'); -- Remove 4 old records
