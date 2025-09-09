SELECT COUNT(*) as total_earnings FROM EarningsTickersToday;
SELECT COUNT(*) as total_market FROM TodayEarningsMovements;
SELECT COUNT(*) as total_guidance FROM BenzingaGuidance;
SELECT DISTINCT reportDate FROM EarningsTickersToday;
SELECT ticker, epsActual, revenueActual FROM EarningsTickersToday WHERE epsActual IS NOT NULL LIMIT 10;
