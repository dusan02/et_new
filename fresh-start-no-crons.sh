#!/bin/bash
# 🚀 Fresh start bez cronov - od začiatku dňa po polnoci

set -e

echo "🚀 FRESH START BEZ CRONOV"
echo "========================="
echo "Spúšťam aplikáciu od začiatku dňa bez cronov..."

cd /var/www/earnings-table

# 1) Načítaj ENV bez CRLF artefaktov
echo "📦 Loading environment..."
set -a
source <(tr -d '\r' < .env.production)
set +a

# 2) Zastav všetky PM2 procesy
echo "🛑 Stopping all PM2 processes..."
pm2 stop all
pm2 delete all

# 3) Vyčisti cache
echo "🗑️  Clearing all caches..."
# Redis cache
redis-cli -u "$REDIS_URL" flushall || echo "⚠️  Redis not available"

# API cache
curl -s -X POST http://127.0.0.1:3001/api/earnings/clear-cache || echo "⚠️  API not running yet"

# 4) Vyčisti databázu pre dnešný deň
echo "🗑️  Clearing today's data from database..."
TODAY=$(date +%Y-%m-%d)
echo "Today: $TODAY"

# Vymaž earnings data pre dnešný deň
npx prisma db execute --file <(echo "DELETE FROM EarningsTickersToday WHERE reportDate = '$TODAY';") || echo "⚠️  Database cleanup failed"

# 5) Spusti len Next.js aplikáciu (bez cronov)
echo "🚀 Starting Next.js application only..."
pm2 start ecosystem.production.config.js --only earnings-app

# 6) Počkaj kým sa aplikácia spustí
echo "⏱️  Waiting for application to start..."
sleep 10

# 7) Otestuj API
echo "🧪 Testing API..."
curl -s "http://127.0.0.1:3001/api/earnings?nocache=1" | head -c 500
echo ""

# 8) Zobraz status
echo ""
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "✅ FRESH START COMPLETED!"
echo "🌐 Application: http://localhost:3001"
echo "📊 API: http://localhost:3001/api/earnings"
echo ""
echo "⚠️  CRON JOBS ARE DISABLED - NO AUTOMATIC DATA FETCHING"
echo "💡 To enable crons later, run: pm2 start ecosystem.production.config.js"
