-- Check how many companies have actual EPS and Revenue data
SELECT 
  COUNT(*) as total_companies,
  COUNT(epsActual) as companies_with_eps_actual,
  COUNT(revenueActual) as companies_with_revenue_actual,
  COUNT(CASE WHEN epsActual IS NOT NULL AND revenueActual IS NOT NULL THEN 1 END) as companies_with_both_actual
FROM earningsTickersToday 
WHERE reportDate = '2025-09-08';

-- Show companies with EPS Actual
SELECT 
  ticker,
  epsEstimate,
  epsActual,
  ROUND(((epsActual - epsEstimate) / epsEstimate) * 100, 2) as eps_surprise_pct
FROM earningsTickersToday 
WHERE reportDate = '2025-09-08' 
  AND epsActual IS NOT NULL
ORDER BY eps_surprise_pct DESC;

-- Show companies with Revenue Actual
SELECT 
  ticker,
  revenueEstimate,
  revenueActual,
  ROUND(((CAST(revenueActual AS REAL) - CAST(revenueEstimate AS REAL)) / CAST(revenueEstimate AS REAL)) * 100, 2) as revenue_surprise_pct
FROM earningsTickersToday 
WHERE reportDate = '2025-09-08' 
  AND revenueActual IS NOT NULL
ORDER BY revenue_surprise_pct DESC;

-- Show companies with NO actual data (only estimates)
SELECT 
  ticker,
  epsEstimate,
  epsActual,
  revenueEstimate,
  revenueActual
FROM earningsTickersToday 
WHERE reportDate = '2025-09-08' 
  AND epsActual IS NULL 
  AND revenueActual IS NULL
ORDER BY ticker;
