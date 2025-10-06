#!/bin/bash
# 🧪 Production Smoke Test
# Runs quick checks to verify system health

set -e

echo "======================================"
echo "🧪 PRODUCTION SMOKE TEST"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

# Helper function to check test
check_test() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}: $1"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}❌ FAIL${NC}: $1"
    FAIL=$((FAIL + 1))
  fi
}

# Test 1: Health endpoint responds
echo "Test 1: Health endpoint..."
HEALTH=$(curl -s http://127.0.0.1:3001/api/health)
echo "$HEALTH" | jq -e '.status == "ok"' > /dev/null
check_test "Health endpoint returns 200 OK"

# Test 2: Health shows ready=true
echo "$HEALTH" | jq -e '.ready == true' > /dev/null
check_test "System is ready (ready=true)"

# Test 3: Has data for today
TOTAL=$(echo "$HEALTH" | jq -r '.total')
[ "$TOTAL" -gt 0 ]
check_test "Has earnings data (total=$TOTAL)"

# Test 4: Main API endpoint
echo ""
echo "Test 4: Main API endpoint..."
API=$(curl -s http://127.0.0.1:3001/api/earnings)
echo "$API" | jq -e '.status == "ok"' > /dev/null
check_test "API returns status=ok"

# Test 5: API has meta.ready
echo "$API" | jq -e '.meta.ready == true' > /dev/null
check_test "API meta.ready is true"

# Test 6: API has data
DATA_LENGTH=$(echo "$API" | jq '.data | length')
[ "$DATA_LENGTH" -gt 0 ]
check_test "API has data array (length=$DATA_LENGTH)"

# Test 7: PM2 processes running
echo ""
echo "Test 7: PM2 processes..."
pm2 list | grep -q "earnings-table.*online"
check_test "earnings-table is online"

pm2 list | grep -q "earnings-cron.*online"
check_test "earnings-cron is online"

# Test 8: Port 3001 listening
echo ""
echo "Test 8: Network..."
sudo ss -ltnp | grep -q :3001
check_test "Port 3001 is listening"

# Test 9: Cache clear endpoint
echo ""
echo "Test 9: Cache control..."
CACHE_CLEAR=$(curl -s -X POST http://127.0.0.1:3001/api/earnings/clear-cache)
echo "$CACHE_CLEAR" | jq -e '.success == true' > /dev/null
check_test "Cache clear endpoint works"

# Test 10: Public domain (optional)
echo ""
echo "Test 10: Public domain..."
PUBLIC=$(curl -s -m 5 https://www.earningstable.com/api/health 2>/dev/null || echo '{"status":"error"}')
echo "$PUBLIC" | jq -e '.status == "ok"' > /dev/null
check_test "Public domain responds" || echo "⚠️  Public domain might be behind proxy/CDN"

# Summary
echo ""
echo "======================================"
echo "📊 SUMMARY"
echo "======================================"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Some tests failed${NC}"
  exit 1
fi

