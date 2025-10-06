-- 🔍 Manual Database Diagnostics
-- Run these queries directly in SQLite/Prisma Studio or via prisma db execute

-- 1️⃣ Check today's earnings count
SELECT 
    COUNT(*) as total_today,
    DATE(reportDate) as report_date
FROM EarningsTickersToday
WHERE DATE(reportDate) = DATE('now')
GROUP BY DATE(reportDate);

-- 2️⃣ Check all recent dates (last 10 days)
SELECT 
    DATE(reportDate) as report_date,
    COUNT(*) as count,
    MIN(createdAt) as first_insert,
    MAX(createdAt) as last_insert
FROM EarningsTickersToday
GROUP BY DATE(reportDate)
ORDER BY report_date DESC
LIMIT 10;

-- 3️⃣ Check exact reportDate format and values
SELECT 
    ticker,
    reportDate,
    datetime(reportDate) as formatted_date,
    reportTime,
    createdAt
FROM EarningsTickersToday
ORDER BY reportDate DESC
LIMIT 10;

-- 4️⃣ Check if there's data for specific date (replace with today's date)
-- Example: 2025-10-06
SELECT 
    ticker,
    reportDate,
    reportTime,
    epsEstimate,
    epsActual,
    createdAt
FROM EarningsTickersToday
WHERE reportDate >= '2025-10-06T00:00:00.000Z'
  AND reportDate < '2025-10-07T00:00:00.000Z'
ORDER BY ticker;

-- 5️⃣ Check market data table
SELECT 
    DATE(reportDate) as report_date,
    COUNT(*) as count
FROM TodayEarningsMovements
GROUP BY DATE(reportDate)
ORDER BY report_date DESC
LIMIT 10;

-- 6️⃣ Check for date range issues
SELECT 
    MIN(reportDate) as earliest_date,
    MAX(reportDate) as latest_date,
    COUNT(*) as total_records
FROM EarningsTickersToday;

-- 7️⃣ Check if Monday (2025-10-06) data exists
SELECT 
    COUNT(*) as monday_count,
    GROUP_CONCAT(ticker, ', ') as tickers
FROM EarningsTickersToday
WHERE reportDate >= '2025-10-06T00:00:00.000Z'
  AND reportDate < '2025-10-07T00:00:00.000Z';

-- 8️⃣ Check createdAt timestamps (to verify cron execution)
SELECT 
    DATE(createdAt) as created_date,
    COUNT(*) as records_created,
    MIN(createdAt) as first_at,
    MAX(createdAt) as last_at
FROM EarningsTickersToday
GROUP BY DATE(createdAt)
ORDER BY created_date DESC
LIMIT 7;

