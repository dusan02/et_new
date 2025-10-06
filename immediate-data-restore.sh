#!/bin/bash
# 🚑 Okamžité obnovenie dát na produkcii

set -e

echo "🚑 OKAMŽITÉ OBNOVENIE DÁT"
echo "=========================="

cd /var/www/earnings-table

# 1) Načítaj ENV bez CRLF artefaktov
echo "📦 Loading environment..."
set -a
source <(tr -d '\r' < .env.production)
set +a

# 2) Reštartni cron (má startup/scheduled fetch)
echo "🔄 Restarting cron process..."
pm2 restart earnings-cron

# 3) Počkaj a skontroluj, či uložil záznamy
echo "⏱️  Waiting 90s for fetch to complete..."
sleep 90

echo ""
echo "📋 Checking cron logs for saved data..."
pm2 logs earnings-cron --lines 150 --nostream | egrep "Saved .* earnings|Unified data fetch|Saved .* market" || echo "⚠️  No 'Saved' messages found yet"

# 4) Zruš cache a otestuj bez cache
echo ""
echo "🗑️  Clearing API cache..."
curl -s -X POST http://127.0.0.1:3001/api/earnings/clear-cache

echo ""
echo "🧪 Testing API (no cache)..."
curl -s "http://127.0.0.1:3001/api/earnings?nocache=1" | head -c 800
echo ""

echo ""
echo "✅ Hotové! Skontroluj výstup vyššie."

