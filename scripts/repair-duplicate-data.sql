-- Repair script to fix duplicate EPS and Revenue data
-- Run this to clean up existing data where actual = estimate

BEGIN TRANSACTION;

-- Fix EPS duplicates (where actual equals estimate)
UPDATE EarningsTickersToday
SET epsActual = NULL
WHERE epsActual IS NOT NULL
  AND epsEstimate IS NOT NULL
  AND abs(epsActual - epsEstimate) <= 0.0001;

-- Fix Revenue duplicates (where actual equals estimate)
-- Note: This is a simple fix. For unit-mismatch cases (e.g., 207672 vs 207672000000),
-- you may need to run a more sophisticated Node.js script
UPDATE EarningsTickersToday
SET revenueActual = NULL
WHERE revenueActual IS NOT NULL
  AND revenueEstimate IS NOT NULL
  AND abs(revenueActual - revenueEstimate) <= (revenueEstimate * 0.0001);

-- Show affected rows
SELECT 
  ticker,
  epsActual,
  epsEstimate,
  revenueActual,
  revenueEstimate,
  'EPS_FIXED' as fix_type
FROM EarningsTickersToday
WHERE epsActual IS NULL 
  AND epsEstimate IS NOT NULL
  AND updatedAt > datetime('now', '-1 hour');

SELECT 
  ticker,
  epsActual,
  epsEstimate,
  revenueActual,
  revenueEstimate,
  'REV_FIXED' as fix_type
FROM EarningsTickersToday
WHERE revenueActual IS NULL 
  AND revenueEstimate IS NOT NULL
  AND updatedAt > datetime('now', '-1 hour');

COMMIT;
