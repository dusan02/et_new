SELECT COUNT(*) as earnings_count FROM EarningsTickersToday;
SELECT COUNT(*) as market_count FROM TodayEarningsMovements;
SELECT COUNT(*) as guidance_count FROM BenzingaGuidance;
SELECT ticker, epsActual FROM EarningsTickersToday WHERE epsActual IS NOT NULL LIMIT 5;
