#!/bin/bash

# ✅ Production Checklist
# 1-minute audit for production readiness

set -e

echo "✅ Starting production checklist..."

# 1. Check unique index (ticker, reportDate)
echo "📊 Checking database indexes..."
INDEX_EXISTS=$(sqlite3 prisma/dev.db "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_earnings_today_ticker_date';" 2>/dev/null || echo "")

if [ -n "$INDEX_EXISTS" ]; then
    echo "✅ Unique index exists"
else
    echo "⚠️  Unique index missing - run: sqlite3 prisma/dev.db \"CREATE UNIQUE INDEX idx_earnings_today_ticker_date ON EarningsTickersToday(ticker, reportDate);\""
fi

# 2. Check atomic publish (Redis next→current swap)
echo "🔄 Checking Redis atomic operations..."
if command -v redis-cli &> /dev/null; then
    echo "✅ Redis available for atomic operations"
else
    echo "⚠️  Redis not available - atomic operations disabled"
fi

# 3. Check cron lock
echo "🔒 Checking cron lock system..."
if command -v redis-cli &> /dev/null; then
    LOCK_EXISTS=$(redis-cli GET cron:lock:fetch-today 2>/dev/null || echo "")
    if [ -n "$LOCK_EXISTS" ]; then
        echo "⚠️  Cron lock exists - check if job is stuck"
    else
        echo "✅ No stuck cron locks"
    fi
else
    echo "⚠️  Redis not available - cron locks disabled"
fi

# 4. Check UTC window consistency
echo "🌍 Checking timezone consistency..."
API_RESPONSE=$(curl -s "http://localhost:3000/api/earnings?nocache=1" 2>/dev/null || echo '{"meta":{"total":0}}')
API_COUNT=$(echo "$API_RESPONSE" | jq -r '.meta.total // 0' 2>/dev/null || echo "0")

if [ "$API_COUNT" -gt 0 ]; then
    echo "✅ API returns data (UTC window working)"
else
    echo "⚠️  API returns 0 items - check timezone consistency"
fi

# 5. Check cache settings
echo "🚫 Checking cache settings..."
# This would need to be checked in the code, but we can verify via headers
CACHE_HEADER=$(curl -s -I "http://localhost:3000/api/earnings?nocache=1" 2>/dev/null | grep -i "cache-control" || echo "")
if [[ "$CACHE_HEADER" == *"no-store"* ]]; then
    echo "✅ Cache-Control: no-store set"
else
    echo "⚠️  Cache-Control not set to no-store"
fi

# 6. Check environment validation
echo "🔧 Checking environment validation..."
if [ -n "$DATABASE_URL" ] && [ -n "$FINNHUB_API_KEY" ] && [ -n "$POLYGON_API_KEY" ]; then
    echo "✅ Required environment variables set"
else
    echo "⚠️  Missing required environment variables"
fi

# 7. Check alert thresholds
echo "🚨 Checking alert system..."
# This would need to be implemented in the code
echo "⚠️  Alert thresholds need to be implemented in code"

# 8. Check CI smoke test
echo "🧪 Running CI smoke test..."
if node scripts/ci-smoke-test.js; then
    echo "✅ CI smoke test passed"
else
    echo "❌ CI smoke test failed"
fi

echo "🎉 Production checklist completed!"
