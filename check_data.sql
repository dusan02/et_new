SELECT COUNT(*) as earnings_count FROM EarningsTickersToday WHERE reportDate = '2025-09-08';
SELECT COUNT(*) as market_count FROM TodayEarningsMovements WHERE reportDate = '2025-09-08';
SELECT COUNT(*) as guidance_count FROM BenzingaGuidance;
SELECT ticker, epsActual, revenueActual FROM EarningsTickersToday WHERE reportDate = '2025-09-08' LIMIT 5;

