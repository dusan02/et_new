#!/bin/bash
# Diagnostický script pre porovnanie DEV vs PROD rozdielov

set -e

echo "🔍 DIAGNÓZA DEV vs PROD ROZDIELOV"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEV_URL="http://localhost:3000"
PROD_URL="https://www.earningstable.com"
TEST_TICKER="STZ"  # Change this to a ticker that shows differences

echo -e "${BLUE}1️⃣  Testovanie API endpointov${NC}"
echo "=================================="

# Test DEV API
echo -e "${YELLOW}Testing DEV API...${NC}"
DEV_RESPONSE=$(curl -s "${DEV_URL}/api/earnings?ticker=${TEST_TICKER}&nocache=1&debug=1" || echo "ERROR")
DEV_HEADERS=$(curl -s -I "${DEV_URL}/api/earnings?ticker=${TEST_TICKER}&nocache=1&debug=1" || echo "ERROR")

# Test PROD API
echo -e "${YELLOW}Testing PROD API...${NC}"
PROD_RESPONSE=$(curl -s "${PROD_URL}/api/earnings?ticker=${TEST_TICKER}&nocache=1&debug=1" || echo "ERROR")
PROD_HEADERS=$(curl -s -I "${PROD_URL}/api/earnings?ticker=${TEST_TICKER}&nocache=1&debug=1" || echo "ERROR")

echo ""
echo -e "${BLUE}2️⃣  Porovnanie hlavičiek${NC}"
echo "=================================="

echo -e "${YELLOW}DEV Headers:${NC}"
echo "$DEV_HEADERS" | grep -E "(x-build|x-cache|x-isr-age|x-env-tz|x-commit)" || echo "No debug headers found"

echo ""
echo -e "${YELLOW}PROD Headers:${NC}"
echo "$PROD_HEADERS" | grep -E "(x-build|x-cache|x-isr-age|x-env-tz|x-commit)" || echo "No debug headers found"

echo ""
echo -e "${BLUE}3️⃣  Porovnanie dát pre ticker ${TEST_TICKER}${NC}"
echo "=================================="

# Extract key data from responses
if [[ "$DEV_RESPONSE" != "ERROR" ]]; then
    echo -e "${YELLOW}DEV Data:${NC}"
    echo "$DEV_RESPONSE" | jq -r '.data[0] | {ticker, currentPrice, previousClose, priceChangePercent, debug}' 2>/dev/null || echo "Failed to parse DEV response"
else
    echo -e "${RED}DEV API Error${NC}"
fi

echo ""
if [[ "$PROD_RESPONSE" != "ERROR" ]]; then
    echo -e "${YELLOW}PROD Data:${NC}"
    echo "$PROD_RESPONSE" | jq -r '.data[0] | {ticker, currentPrice, previousClose, priceChangePercent, debug}' 2>/dev/null || echo "Failed to parse PROD response"
else
    echo -e "${RED}PROD API Error${NC}"
fi

echo ""
echo -e "${BLUE}4️⃣  Testovanie Polygon API (ak je dostupný API key)${NC}"
echo "=================================="

if [[ -n "$POLYGON_API_KEY" ]]; then
    echo -e "${YELLOW}Testing Polygon Snapshot API...${NC}"
    POLYGON_SNAPSHOT=$(curl -s "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${TEST_TICKER}?apikey=${POLYGON_API_KEY}")
    
    echo -e "${YELLOW}Testing Polygon Aggs API...${NC}"
    POLYGON_AGGS=$(curl -s "https://api.polygon.io/v2/aggs/ticker/${TEST_TICKER}/prev?adjusted=true&apikey=${POLYGON_API_KEY}")
    
    echo -e "${YELLOW}Polygon Snapshot Data:${NC}"
    echo "$POLYGON_SNAPSHOT" | jq -r '.ticker | {ticker, lastTrade: .lastTrade.p, dayClose: .day.c, prevDayClose: .prevDay.c}' 2>/dev/null || echo "Failed to parse Polygon snapshot"
    
    echo ""
    echo -e "${YELLOW}Polygon Aggs Data:${NC}"
    echo "$POLYGON_AGGS" | jq -r '.results[0] | {close: .c, high: .h, low: .l, volume: .v}' 2>/dev/null || echo "Failed to parse Polygon aggs"
else
    echo -e "${YELLOW}POLYGON_API_KEY not set, skipping Polygon tests${NC}"
fi

echo ""
echo -e "${BLUE}5️⃣  Environment Variables Check${NC}"
echo "=================================="

echo -e "${YELLOW}Local Environment:${NC}"
echo "NODE_ENV: $NODE_ENV"
echo "TZ: $TZ"
echo "NEXT_PUBLIC_APP_URL: $NEXT_PUBLIC_APP_URL"

echo ""
echo -e "${BLUE}6️⃣  Summary${NC}"
echo "=================================="

# Compare responses
if [[ "$DEV_RESPONSE" != "ERROR" && "$PROD_RESPONSE" != "ERROR" ]]; then
    DEV_PRICE=$(echo "$DEV_RESPONSE" | jq -r '.data[0].priceChangePercent // "null"' 2>/dev/null)
    PROD_PRICE=$(echo "$PROD_RESPONSE" | jq -r '.data[0].priceChangePercent // "null"' 2>/dev/null)
    
    if [[ "$DEV_PRICE" == "$PROD_PRICE" ]]; then
        echo -e "${GREEN}✅ Price change percent matches: ${DEV_PRICE}${NC}"
    else
        echo -e "${RED}❌ Price change percent differs:${NC}"
        echo -e "   DEV:  ${DEV_PRICE}"
        echo -e "   PROD: ${PROD_PRICE}"
    fi
else
    echo -e "${RED}❌ Cannot compare - one or both APIs failed${NC}"
fi

echo ""
echo -e "${BLUE}7️⃣  Next Steps${NC}"
echo "=================================="
echo "1. Check if debug headers are present in both responses"
echo "2. Compare the debug data in JSON responses"
echo "3. Verify Polygon API responses if API key is available"
echo "4. Check environment variables differences"
echo "5. Look for cache vs fresh data differences"

echo ""
echo "✅ Diagnostika dokončená!"
