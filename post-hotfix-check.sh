#!/bin/bash
# 🧪 Post-hotfix validation checklist

set -e

echo "🧪 POST-HOTFIX VALIDATION"
echo "========================="

cd /var/www/earnings-table

# Load ENV
set -a
source <(tr -d '\r' < .env.production)
set +a

echo ""
echo "1️⃣  Building application..."
npm run build

echo ""
echo "2️⃣  Restarting PM2 processes..."
pm2 restart earnings-cron --update-env
pm2 restart earnings-table --update-env

echo ""
echo "3️⃣  Waiting for processes to stabilize..."
sleep 10

echo ""
echo "4️⃣  Checking PM2 status..."
pm2 status

echo ""
echo "5️⃣  Checking cron logs for saved data..."
pm2 logs earnings-cron --lines 50 --nostream | egrep "Saved .* earnings|Unified data fetch|PRESERVED" || echo "⚠️  No save/preserve messages yet"

echo ""
echo "6️⃣  Clearing API cache..."
curl -s -X POST http://127.0.0.1:3001/api/earnings/clear-cache

echo ""
echo "7️⃣  Testing API (no cache)..."
RESPONSE=$(curl -s "http://127.0.0.1:3001/api/earnings?nocache=1")
echo "$RESPONSE" | head -c 800
echo ""

# Check if response has data
if echo "$RESPONSE" | grep -q '"status":"ok"'; then
    echo "✅ API responding with OK status"
elif echo "$RESPONSE" | grep -q '"status":"no-data"'; then
    echo "⚠️  API still returning no-data"
else
    echo "❌ Unexpected API response"
fi

echo ""
echo "8️⃣  Checking database for today's records..."
if command -v sqlite3 &> /dev/null && [ -f "prisma/dev.db" ]; then
    TODAY=$(date -u +%Y-%m-%d)
    COUNT=$(sqlite3 prisma/dev.db "SELECT COUNT(*) FROM EarningsTickersToday WHERE date(reportDate) = '$TODAY';")
    echo "📊 Today's earnings count in DB: $COUNT"
fi

echo ""
echo "✅ Validation completed!"
echo ""
echo "📋 Next steps:"
echo "   - Monitor API for 5-10 minutes"
echo "   - Check website: https://www.earningstable.com"
echo "   - Verify data appears correctly"

