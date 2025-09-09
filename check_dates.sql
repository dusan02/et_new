SELECT DISTINCT reportDate FROM EarningsTickersToday ORDER BY reportDate DESC LIMIT 5;
SELECT DISTINCT reportDate FROM TodayEarningsMovements ORDER BY reportDate DESC LIMIT 5;
SELECT COUNT(*) as count, reportDate FROM EarningsTickersToday GROUP BY reportDate ORDER BY reportDate DESC;
