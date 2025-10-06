#!/bin/bash
# 🔍 Production Diagnostics Script
# Usage: Run on production server to diagnose "No Earnings Scheduled" issue

echo "======================================"
echo "🔍 PRODUCTION DIAGNOSTICS"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# I. ENVIRONMENT CHECK
echo -e "${YELLOW}I. ENVIRONMENT CHECK${NC}"
echo "--------------------------------------"
echo "Current date/time (server):"
date
echo ""
echo "Current date/time (NY timezone):"
TZ=America/New_York date
echo ""
echo "DATABASE_URL (masked):"
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL not set in environment${NC}"
else
    echo "$DATABASE_URL" | sed 's/\(.*:\/\/[^:]*:\)[^@]*\(@.*\)/\1***\2/'
fi
echo ""

# II. PM2 / CRON STATUS
echo -e "${YELLOW}II. PM2 / CRON STATUS${NC}"
echo "--------------------------------------"
echo "PM2 processes:"
pm2 list
echo ""
echo "Last 30 lines of PM2 logs for earnings-table:"
pm2 logs earnings-table --lines 30 --nostream
echo ""

# III. DATABASE CHECK
echo -e "${YELLOW}III. DATABASE CHECK${NC}"
echo "--------------------------------------"
echo "⚠️  Manual SQL check required. Run these queries:"
echo ""
echo "1️⃣ Check if there are any records for today in EarningsTickersToday:"
echo "   SELECT COUNT(*), DATE(reportDate) as date FROM EarningsTickersToday"
echo "   WHERE DATE(reportDate) = DATE('now') GROUP BY date;"
echo ""
echo "2️⃣ Check all dates in database:"
echo "   SELECT DATE(reportDate) as date, COUNT(*) as count"
echo "   FROM EarningsTickersToday GROUP BY date ORDER BY date DESC LIMIT 10;"
echo ""
echo "3️⃣ Check what date format is stored:"
echo "   SELECT ticker, reportDate, datetime(reportDate) FROM EarningsTickersToday LIMIT 5;"
echo ""
echo "4️⃣ Check if cron job succeeded today:"
echo "   SELECT MAX(createdAt) as last_insert FROM EarningsTickersToday;"
echo ""

# IV. API ENDPOINT CHECK
echo -e "${YELLOW}IV. API ENDPOINT CHECK${NC}"
echo "--------------------------------------"
echo "Testing /api/earnings endpoint:"
curl -s http://localhost:3000/api/earnings | jq '.meta'
echo ""
echo "Full API response:"
curl -s http://localhost:3000/api/earnings | jq '.'
echo ""

# V. CACHE CHECK
echo -e "${YELLOW}V. CACHE CHECK${NC}"
echo "--------------------------------------"
echo "Clearing API cache:"
curl -X POST http://localhost:3000/api/earnings/clear-cache
echo ""
echo "Testing API after cache clear:"
curl -s http://localhost:3000/api/earnings | jq '.meta'
echo ""

# VI. LOG FILES CHECK
echo -e "${YELLOW}VI. LOG FILES CHECK${NC}"
echo "--------------------------------------"
echo "Recent cron/fetch logs (if exists):"
if [ -f "/var/log/earnings-fetch.log" ]; then
    tail -50 /var/log/earnings-fetch.log
else
    echo "No log file found at /var/log/earnings-fetch.log"
fi
echo ""

# VII. TIMEZONE / DATE CALCULATION CHECK
echo -e "${YELLOW}VII. TIMEZONE / DATE CALCULATION CHECK${NC}"
echo "--------------------------------------"
echo "Server UTC date:"
date -u +"%Y-%m-%d"
echo "Server local date:"
date +"%Y-%m-%d"
echo "NY timezone date:"
TZ=America/New_York date +"%Y-%m-%d"
echo ""
echo "Node.js date calculation (from isoDate()):"
node -e "const isoDate = () => new Date().toISOString().split('T')[0]; console.log(isoDate())"
echo ""

# VIII. SUMMARY
echo -e "${YELLOW}VIII. DIAGNOSTIC SUMMARY${NC}"
echo "--------------------------------------"
echo "✅ Next steps based on results:"
echo ""
echo "🔹 If DATABASE_URL is wrong → fix .env.production"
echo "🔹 If no data in DB → check cron job execution"
echo "🔹 If data exists but API returns empty → check date filter in API"
echo "🔹 If API returns data but FE shows 'No Earnings' → check frontend cache"
echo "🔹 If timezone mismatch → adjust date calculation in fetch-today.ts"
echo ""
echo "======================================"
echo "✅ Diagnostics Complete"
echo "======================================"

