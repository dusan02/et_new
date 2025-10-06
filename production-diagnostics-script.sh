#!/bin/bash
# 🔍 Production Diagnostics Script
# Pre použitie na produkcii: bash production-diagnostics-script.sh
# Predpokladá, že si v /var/www/earnings-table

set -e  # Stop on errors

echo "======================================"
echo "🔍 PRODUCTION DIAGNOSTICS"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# 0. WORKING DIRECTORY CHECK
# ============================================
echo -e "${YELLOW}0. WORKING DIRECTORY CHECK${NC}"
echo "--------------------------------------"
echo "Current directory: $(pwd)"
echo "Expected: /var/www/earnings-table"
echo ""

if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ ERROR: package.json not found!${NC}"
  echo "You must run this script from /var/www/earnings-table"
  echo "Run: cd /var/www/earnings-table && bash production-diagnostics-script.sh"
  exit 1
fi

echo -e "${GREEN}✅ Correct directory${NC}"
echo ""

# ============================================
# 1. SERVER INFO
# ============================================
echo -e "${YELLOW}1. SERVER INFO${NC}"
echo "--------------------------------------"
echo "Server UTC time: $(date -u)"
echo "Server local time: $(date)"
echo "Server date (UTC): $(date -u +"%Y-%m-%d")"
echo "Server date (local): $(date +"%Y-%m-%d")"
echo "NY time: $(TZ=America/New_York date)"
echo "NY date: $(TZ=America/New_York date +"%Y-%m-%d")"
echo ""

# ============================================
# 2. PORT & PROCESS CHECK
# ============================================
echo -e "${YELLOW}2. PORT & PROCESS CHECK${NC}"
echo "--------------------------------------"
echo "Checking port 3001 (Next.js):"
sudo ss -ltnp | grep 3001 || echo "Port 3001 not listening"
echo ""

echo "PM2 processes:"
pm2 list
echo ""

# ============================================
# 3. API ENDPOINT TEST (PORT 3001)
# ============================================
echo -e "${YELLOW}3. API ENDPOINT TEST (PORT 3001)${NC}"
echo "--------------------------------------"
echo "Testing http://127.0.0.1:3001/api/earnings..."
echo ""

API_RESPONSE=$(curl -s http://127.0.0.1:3001/api/earnings 2>&1 || echo "CURL_FAILED")

if [[ "$API_RESPONSE" == "CURL_FAILED" ]]; then
  echo -e "${RED}❌ API request failed${NC}"
else
  echo "Response preview (first 500 chars):"
  echo "$API_RESPONSE" | head -c 500
  echo ""
  echo ""
  
  # Try to parse JSON if jq is available
  if command -v jq &> /dev/null; then
    echo "Response meta (parsed):"
    echo "$API_RESPONSE" | jq '.meta' 2>/dev/null || echo "Could not parse JSON"
    echo ""
    
    DATA_COUNT=$(echo "$API_RESPONSE" | jq '.data | length' 2>/dev/null || echo "0")
    echo "Data array length: $DATA_COUNT"
    
    if [ "$DATA_COUNT" -eq 0 ]; then
      echo -e "${RED}❌ API returns EMPTY data array!${NC}"
    else
      echo -e "${GREEN}✅ API returns data (${DATA_COUNT} records)${NC}"
    fi
  else
    echo "⚠️  jq not installed, showing raw response"
  fi
fi
echo ""

# ============================================
# 4. PM2 ENVIRONMENT VARIABLES
# ============================================
echo -e "${YELLOW}4. PM2 ENVIRONMENT VARIABLES${NC}"
echo "--------------------------------------"
echo "Checking PM2 env for earnings-table:"
pm2 env earnings-table | grep -E "DATABASE_URL|NODE_ENV|FINNHUB|POLYGON" || echo "No relevant env vars found"
echo ""

echo "Checking .env.production file:"
if [ -f ".env.production" ]; then
  echo "DATABASE_URL from .env.production:"
  grep "DATABASE_URL" .env.production | head -1 || echo "Not found"
else
  echo "⚠️  .env.production file not found"
fi
echo ""

# ============================================
# 5. PM2 CRON LOGS (last 100 lines)
# ============================================
echo -e "${YELLOW}5. PM2 CRON LOGS (earnings-cron)${NC}"
echo "--------------------------------------"
echo "Last 100 lines from earnings-cron:"
pm2 logs earnings-cron --lines 100 --nostream | tail -50
echo ""

echo "Looking for today's fetch in logs..."
TODAY_UTC=$(date -u +"%Y-%m-%d")
TODAY_NY=$(TZ=America/New_York date +"%Y-%m-%d")
echo "Searching for: $TODAY_UTC or $TODAY_NY"
pm2 logs earnings-cron --lines 200 --nostream | grep -E "$TODAY_UTC|$TODAY_NY|unified data fetch|earningsCount|marketCount" | tail -20 || echo "No matching log entries found"
echo ""

# ============================================
# 6. DATABASE CHECK
# ============================================
echo -e "${YELLOW}6. DATABASE CHECK${NC}"
echo "--------------------------------------"

# Find database file
DB_FILE=$(grep -E "url.*=.*file:" prisma/schema.prisma | sed -n 's/.*file:\(.*\)".*/\1/p' | xargs || echo "")

if [ -z "$DB_FILE" ]; then
  echo "Database URL from schema.prisma:"
  grep "url" prisma/schema.prisma || echo "Could not find URL"
  echo ""
  echo "⚠️  Not a file-based database (probably PostgreSQL/MySQL)"
  echo "Using Prisma to query..."
  echo ""
  
  # Try with npx prisma
  if command -v npx &> /dev/null; then
    echo "Running Prisma query..."
    node -e "
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    (async () => {
      try {
        const today = new Date('$TODAY_UTC' + 'T00:00:00.000Z');
        console.log('Querying for date:', today.toISOString());
        
        const count = await prisma.earningsTickersToday.count({
          where: { reportDate: today }
        });
        console.log('Today earnings count:', count);
        
        const allDates = await prisma.\$queryRaw\`
          SELECT DATE(reportDate) as date, COUNT(*) as count
          FROM EarningsTickersToday
          GROUP BY DATE(reportDate)
          ORDER BY date DESC
          LIMIT 10
        \`;
        console.log('Recent dates:');
        console.table(allDates);
      } catch (error) {
        console.error('Error:', error.message);
      } finally {
        await prisma.\$disconnect();
      }
    })();
    " 2>&1 || echo "Prisma query failed"
  fi
else
  echo "Found SQLite database: $DB_FILE"
  
  if [ ! -f "$DB_FILE" ]; then
    echo -e "${RED}❌ Database file does not exist: $DB_FILE${NC}"
  else
    echo -e "${GREEN}✅ Database file exists${NC}"
    echo "File size: $(du -h "$DB_FILE" | cut -f1)"
    echo ""
    
    if command -v sqlite3 &> /dev/null; then
      echo "Querying database..."
      echo ""
      
      echo "=== Current UTC date from DB perspective ==="
      sqlite3 "$DB_FILE" "SELECT datetime('now') as utc_now, date('now') as utc_today;"
      echo ""
      
      echo "=== Earnings count by date (last 10 days) ==="
      sqlite3 "$DB_FILE" ".headers on" ".mode column" "
        SELECT 
          DATE(reportDate) as report_date,
          COUNT(*) as count,
          MIN(createdAt) as first_created,
          MAX(createdAt) as last_created
        FROM EarningsTickersToday
        GROUP BY DATE(reportDate)
        ORDER BY report_date DESC
        LIMIT 10;
      "
      echo ""
      
      echo "=== Today's earnings (UTC: $TODAY_UTC) ==="
      TODAY_COUNT=$(sqlite3 "$DB_FILE" "
        SELECT COUNT(*)
        FROM EarningsTickersToday
        WHERE reportDate >= '${TODAY_UTC}T00:00:00.000Z'
          AND reportDate < date('${TODAY_UTC}', '+1 day') || 'T00:00:00.000Z';
      ")
      echo "Count: $TODAY_COUNT"
      
      if [ "$TODAY_COUNT" -eq 0 ]; then
        echo -e "${RED}❌ NO DATA FOR TODAY ($TODAY_UTC)${NC}"
        echo ""
        echo "Checking adjacent dates..."
        
        YESTERDAY=$(date -u -d "$TODAY_UTC - 1 day" +"%Y-%m-%d" 2>/dev/null || date -u -v-1d +"%Y-%m-%d" 2>/dev/null || echo "")
        TOMORROW=$(date -u -d "$TODAY_UTC + 1 day" +"%Y-%m-%d" 2>/dev/null || date -u -v+1d +"%Y-%m-%d" 2>/dev/null || echo "")
        
        if [ -n "$YESTERDAY" ]; then
          YESTERDAY_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM EarningsTickersToday WHERE DATE(reportDate) = '$YESTERDAY';")
          echo "Yesterday ($YESTERDAY): $YESTERDAY_COUNT records"
        fi
        
        if [ -n "$TOMORROW" ]; then
          TOMORROW_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM EarningsTickersToday WHERE DATE(reportDate) = '$TOMORROW';")
          echo "Tomorrow ($TOMORROW): $TOMORROW_COUNT records"
        fi
        
        if [ "$YESTERDAY_COUNT" -gt 0 ] || [ "$TOMORROW_COUNT" -gt 0 ]; then
          echo ""
          echo -e "${YELLOW}⚠️  WARNING: Data exists for adjacent dates but not today!${NC}"
          echo "This suggests a TIMEZONE/UTC window problem."
        fi
      else
        echo -e "${GREEN}✅ Data exists for today${NC}"
        echo ""
        echo "Sample records:"
        sqlite3 "$DB_FILE" ".headers on" ".mode column" "
          SELECT ticker, reportDate, reportTime
          FROM EarningsTickersToday
          WHERE DATE(reportDate) = '$TODAY_UTC'
          LIMIT 5;
        "
      fi
    else
      echo "⚠️  sqlite3 not installed, cannot query database"
    fi
  fi
fi
echo ""

# ============================================
# 7. SUMMARY & RECOMMENDATIONS
# ============================================
echo -e "${YELLOW}7. SUMMARY & RECOMMENDATIONS${NC}"
echo "======================================"
echo ""

if [ "$TODAY_COUNT" -gt 0 ] && [ "$DATA_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ STATUS: HEALTHY${NC}"
  echo "   - Database has data for today"
  echo "   - API returns data"
  echo "   - Frontend should display earnings"
  echo ""
  echo "If frontend still shows 'No Earnings Scheduled':"
  echo "   1. Clear browser cache (Ctrl+F5)"
  echo "   2. Check browser DevTools Network tab"
  echo "   3. Clear server cache: curl -X POST http://127.0.0.1:3001/api/earnings/clear-cache"
elif [ "$TODAY_COUNT" -gt 0 ] && [ "$DATA_COUNT" -eq 0 ]; then
  echo -e "${YELLOW}⚠️  STATUS: API ISSUE${NC}"
  echo "   - Database HAS data for today"
  echo "   - API returns EMPTY data"
  echo ""
  echo "Possible causes:"
  echo "   1. Wrong DATABASE_URL in PM2 environment"
  echo "   2. Date filter mismatch in API code"
  echo "   3. Cache serving old data"
  echo ""
  echo "Quick fixes:"
  echo "   1. pm2 restart earnings-table --update-env"
  echo "   2. curl -X POST http://127.0.0.1:3001/api/earnings/clear-cache"
  echo "   3. Check DATABASE_URL: pm2 env earnings-table | grep DATABASE_URL"
elif [ "$TODAY_COUNT" -eq 0 ]; then
  echo -e "${RED}❌ STATUS: NO DATA IN DATABASE${NC}"
  echo "   - Database has NO data for today ($TODAY_UTC)"
  echo ""
  
  if [ "$YESTERDAY_COUNT" -gt 0 ] || [ "$TOMORROW_COUNT" -gt 0 ]; then
    echo "   - But data EXISTS for adjacent dates"
    echo "   - This is a TIMEZONE/UTC WINDOW problem"
    echo ""
    echo "Root cause:"
    echo "   - Cron fetches data for 'today' in one timezone"
    echo "   - API queries for 'today' in different timezone"
    echo "   - Data is stored with wrong date offset"
    echo ""
    echo "Fix options:"
    echo "   1. Manual fetch for today:"
    echo "      cd /var/www/earnings-table"
    echo "      DATE=$TODAY_UTC npm run fetch:data"
    echo ""
    echo "   2. Update date calculation in code to use consistent timezone"
    echo "   3. Restart cron to fetch today's data:"
    echo "      pm2 restart earnings-cron --update-env"
  else
    echo "Possible causes:"
    echo "   1. Cron job not running"
    echo "   2. Cron job failing (check logs above)"
    echo "   3. Wrong API keys (FINNHUB_API_KEY, POLYGON_API_KEY)"
    echo "   4. Wrong database file/connection"
    echo ""
    echo "Quick fixes:"
    echo "   1. Check cron logs: pm2 logs earnings-cron --lines 200"
    echo "   2. Manual fetch: cd /var/www/earnings-table && npm run fetch:data"
    echo "   3. Restart cron: pm2 restart earnings-cron --update-env"
  fi
else
  echo -e "${YELLOW}⚠️  STATUS: UNABLE TO DETERMINE${NC}"
  echo "Check the output above for errors"
fi

echo ""
echo "======================================"
echo "✅ Diagnostics Complete"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Review the output above"
echo "2. If you need help, share this output"
echo "3. Common fixes:"
echo "   - pm2 restart all --update-env"
echo "   - curl -X POST http://127.0.0.1:3001/api/earnings/clear-cache"
echo "   - Manual fetch: npm run fetch:data"
echo ""

