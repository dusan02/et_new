SELECT reportDate, COUNT(*) as count FROM EarningsTickersToday GROUP BY reportDate ORDER BY reportDate DESC;
SELECT reportDate, COUNT(*) as count FROM TodayEarningsMovements GROUP BY reportDate ORDER BY reportDate DESC;
