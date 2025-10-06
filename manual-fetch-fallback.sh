#!/bin/bash
# 🔧 Manuálny fetch ako záloha (ak cron nereaguje)

set -e

echo "🔧 MANUÁLNY FETCH (fallback)"
echo "============================"

cd /var/www/earnings-table

# Načítaj ENV
set -a
source <(tr -d '\r' < .env.production)
set +a

# Nájdi fetch skript
echo "🔍 Looking for fetch script..."
if [ -f "src/jobs/fetch-today.ts" ]; then
  echo "✅ Found: src/jobs/fetch-today.ts"
  npx tsx src/jobs/fetch-today.ts
elif [ -f "src/jobs/fetch-today.js" ]; then
  echo "✅ Found: src/jobs/fetch-today.js"
  node -r dotenv/config src/jobs/fetch-today.js
elif [ -f "scripts/cron.js" ]; then
  echo "✅ Found: scripts/cron.js"
  node -r dotenv/config scripts/cron.js --once
else
  echo "❌ No fetch script found!"
  exit 1
fi

echo ""
echo "✅ Manual fetch completed!"

