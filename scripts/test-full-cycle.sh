#!/bin/bash

# 🧪 Full Daily Cycle Test
# Simuluje reálny denný cyklus systému (Reset + Fetch + Publish + Verify)

set -e

echo "🧪 Starting Full Daily Cycle Test..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Function to run test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}🧪 Test $TOTAL_TESTS: $test_name${NC}"
    echo "Command: $test_command"
    
    if eval "$test_command" 2>/dev/null | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✅ PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Function to check API response
check_api_response() {
    local url="$1"
    local expected_count="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}🧪 Test $TOTAL_TESTS: API Response Check${NC}"
    echo "URL: $url"
    
    local response=$(curl -s "$url" 2>/dev/null || echo '{"meta":{"total":0}}')
    local count=$(echo "$response" | jq -r '.meta.total // 0' 2>/dev/null || echo "0")
    
    if [ "$count" -eq "$expected_count" ]; then
        echo -e "${GREEN}✅ PASSED - API returned $count items${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAILED - API returned $count items (expected $expected_count)${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Function to check database content
check_db_content() {
    local table="$1"
    local expected_count="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}🧪 Test $TOTAL_TESTS: Database Content Check${NC}"
    echo "Table: $table, Expected: $expected_count records"
    
    local count=$(sqlite3 prisma/dev.db "SELECT COUNT(*) FROM $table WHERE date(reportDate) = date('now');" 2>/dev/null || echo "0")
    
    if [ "$count" -eq "$expected_count" ]; then
        echo -e "${GREEN}✅ PASSED - Found $count records${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAILED - Found $count records (expected $expected_count)${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Function to check Redis content
check_redis_content() {
    local key="$1"
    local expected_count="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}🧪 Test $TOTAL_TESTS: Redis Content Check${NC}"
    echo "Key: $key, Expected: $expected_count items"
    
    if command -v redis-cli &> /dev/null; then
        local response=$(redis-cli GET "$key" 2>/dev/null || echo '[]')
        local count=$(echo "$response" | jq -r '. | length' 2>/dev/null || echo "0")
        
        if [ "$count" -eq "$expected_count" ]; then
            echo -e "${GREEN}✅ PASSED - Redis contains $count items${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            return 0
        else
            echo -e "${RED}❌ FAILED - Redis contains $count items (expected $expected_count)${NC}"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  SKIPPED - Redis not available${NC}"
        return 0
    fi
}

# Start the test sequence
echo -e "\n${YELLOW}🚀 Step 1: Running Daily Automation Pipeline${NC}"
echo "=============================================="

# Run the daily automation
if SKIP_RESET_CHECK=true npx tsx scripts/daily-automation.ts run; then
    echo -e "${GREEN}✅ Daily automation completed successfully${NC}"
else
    echo -e "${RED}❌ Daily automation failed${NC}"
    echo -e "${RED}💥 Test sequence aborted${NC}"
    exit 1
fi

# Wait a moment for data to be processed
sleep 2

echo -e "\n${YELLOW}🧮 Step 2: Verifying Data Pipeline${NC}"
echo "=================================="

# Test 1: Check Finnhub fetch logs
run_test "Finnhub Fetch" "grep -q '🧩 \[FINNHUB\] Returned tickers: 5' logs/*.log 2>/dev/null || echo 'No Finnhub logs found'" "🧩 \[FINNHUB\] Returned tickers: 5"

# Test 2: Check database upsert logs
run_test "Database Upsert" "grep -q '✅ \[DB\]\[UPSERT\] in=5' logs/*.log 2>/dev/null || echo 'No DB upsert logs found'" "✅ \[DB\]\[UPSERT\] in=5"

# Test 3: Check publish logs
run_test "Data Publish" "grep -q '\[PUBLISH\] items=5' logs/*.log 2>/dev/null || echo 'No publish logs found'" "\[PUBLISH\] items=5"

# Test 4: Check daily summary logs
run_test "Daily Summary" "grep -q '\[DAILY\] finnhub=5 db=5' logs/*.log 2>/dev/null || echo 'No daily summary logs found'" "\[DAILY\] finnhub=5 db=5"

echo -e "\n${YELLOW}🧠 Step 3: Database Verification${NC}"
echo "=================================="

# Test 5: Check database content
check_db_content "EarningsTickersToday" 5

# Test 6: Run smoke test
run_test "Smoke Test" "npx tsx scripts/smoke-cron-today.ts" "✅ \[SMOKE-TEST\] PASSED"

echo -e "\n${YELLOW}🌐 Step 4: API Verification${NC}"
echo "=============================="

# Test 7: Check API endpoint
check_api_response "http://localhost:3000/api/earnings/today" 5

# Test 8: Check API with nocache
check_api_response "http://localhost:3000/api/earnings?nocache=1" 5

echo -e "\n${YELLOW}⚙️ Step 5: Redis Verification${NC}"
echo "=================================="

# Test 9: Check Redis content
check_redis_content "earnings:today" 5

# Test 10: Check published data
check_redis_content "earnings:2025-10-10:published" 5

echo -e "\n${YELLOW}🧩 Step 6: Sanity Check${NC}"
echo "=========================="

# Test 11: Run sanity check script
run_test "Sanity Check" "bash scripts/sanity-check.sh" "\[OK\]"

echo -e "\n${YELLOW}🚀 Step 7: Health Verification${NC}"
echo "=================================="

# Test 12: Check health endpoint
run_test "Health Check" "curl -s http://localhost:3000/api/health" "healthy"

# Test 13: Check CI smoke test
run_test "CI Smoke Test" "node scripts/ci-smoke-test.js" "✅ \[CI-SMOKE\] PASSED"

# Final results
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}🎯 FINAL TEST RESULTS${NC}"
echo -e "${BLUE}========================================${NC}"

echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL TESTS PASSED! 🎉${NC}"
    echo -e "${GREEN}✅ Full daily cycle is working perfectly${NC}"
    echo -e "${GREEN}✅ System is production-ready${NC}"
    exit 0
else
    echo -e "\n${RED}💥 SOME TESTS FAILED! 💥${NC}"
    echo -e "${RED}❌ System needs attention${NC}"
    echo -e "${YELLOW}💡 Check the failed tests above for details${NC}"
    exit 1
fi
