#!/bin/bash

# 🔍 Sanity Check Script
# Spúšťajte po deploy na overenie end-to-end pipeline

echo "🔍 Starting sanity check..."

# 1) DB dnešok (UTC okno)
echo "📊 Checking today's data in DB..."
sqlite3 prisma/dev.db "SELECT ticker, reportDate FROM EarningsTickersToday WHERE reportDate BETWEEN datetime('now','start of day') AND datetime('now','start of day','+1 day');" | wc -l

# 2) API musí vrátiť >=5
echo "🌐 Testing API endpoint..."
API_RESPONSE=$(curl -s "http://localhost:3000/api/earnings?nocache=1&ts=$(date +%s)")
COUNT=$(echo "$API_RESPONSE" | jq -r '.meta.total // 0')

if [ "$COUNT" -ge 5 ]; then
    echo "✅ API returned $COUNT items"
    echo "$API_RESPONSE" | jq '{date: .meta.date, count: .meta.total, sample: [.data[0:2][] | .ticker]}'
else
    echo "❌ API returned only $COUNT items (expected >=5)"
    exit 1
fi

# 3) Cron rezime (po najbližšom behu)
echo "📋 Checking for daily summary logs..."
if grep -q "\[DAILY\] finnhub=.* db=.* published=.* api=.*" logs/*.log 2>/dev/null; then
    echo "✅ Found daily summary logs"
    grep "\[DAILY\] finnhub=.* db=.* published=.* api=.*" logs/*.log | tail -1
else
    echo "⚠️  No daily summary logs found (run cron first)"
fi

echo "🎉 Sanity check completed!"
