#!/bin/bash

# 🔄 Data Rollback Script
# Rollback to last known good state

set -e

echo "🔄 Starting data rollback..."

# Check if Redis is available
if command -v redis-cli &> /dev/null; then
    echo "📊 Checking Redis backup..."
    
    # Check if backup exists
    if redis-cli GET earnings:today:backup &> /dev/null; then
        echo "✅ Found Redis backup, restoring..."
        redis-cli GET earnings:today:backup | redis-cli -x SET earnings:today
        echo "✅ Redis data restored from backup"
    else
        echo "⚠️  No Redis backup found"
    fi
    
    # Check if next backup exists (from atomic swap)
    if redis-cli GET earnings:today:next &> /dev/null; then
        echo "✅ Found next backup, restoring..."
        redis-cli GET earnings:today:next | redis-cli -x SET earnings:today
        echo "✅ Redis data restored from next backup"
    fi
else
    echo "⚠️  Redis not available, skipping Redis rollback"
fi

# Database rollback (if backup exists)
if [ -f "prisma/dev.db.backup" ]; then
    echo "💾 Found database backup, restoring..."
    cp prisma/dev.db.backup prisma/dev.db
    echo "✅ Database restored from backup"
else
    echo "⚠️  No database backup found"
fi

# Check if yesterday's data exists
echo "📅 Checking for yesterday's data..."
YESTERDAY_COUNT=$(sqlite3 prisma/dev.db "SELECT COUNT(*) FROM EarningsTickersToday WHERE date(reportDate) = date('now', '-1 day');" 2>/dev/null || echo "0")

if [ "$YESTERDAY_COUNT" -gt 0 ]; then
    echo "✅ Found $YESTERDAY_COUNT records from yesterday"
    echo "💡 You can manually copy yesterday's data to today if needed:"
    echo "   sqlite3 prisma/dev.db \"UPDATE EarningsTickersToday SET reportDate = date('now') WHERE date(reportDate) = date('now', '-1 day');\""
else
    echo "⚠️  No yesterday's data found"
fi

# Test API after rollback
echo "🧪 Testing API after rollback..."
API_RESPONSE=$(curl -s "http://localhost:3000/api/earnings?nocache=1" 2>/dev/null || echo '{"meta":{"total":0}}')
COUNT=$(echo "$API_RESPONSE" | jq -r '.meta.total // 0' 2>/dev/null || echo "0")

if [ "$COUNT" -gt 0 ]; then
    echo "✅ API now returns $COUNT items"
else
    echo "❌ API still returns 0 items"
    echo "💡 Try running: npm run job:fetch"
fi

echo "🎉 Rollback completed!"
