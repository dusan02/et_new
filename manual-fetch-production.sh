#!/bin/bash
# 🚀 Manual Fetch for Production
# Spustí manuálne fetch dnešných earnings dát
# Usage: bash manual-fetch-production.sh

set -e

echo "======================================"
echo "🚀 MANUAL FETCH TODAY'S EARNINGS"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ ERROR: Not in project directory"
  echo "Run: cd /var/www/earnings-table && bash manual-fetch-production.sh"
  exit 1
fi

echo "Current directory: $(pwd)"
echo "Date (UTC): $(date -u +"%Y-%m-%d")"
echo "Date (NY): $(TZ=America/New_York date +"%Y-%m-%d")"
echo ""

# Check if we should use a specific date
if [ -n "$1" ]; then
  FETCH_DATE="$1"
  echo "Fetching data for: $FETCH_DATE (from argument)"
else
  FETCH_DATE=$(date -u +"%Y-%m-%d")
  echo "Fetching data for: $FETCH_DATE (today UTC)"
fi

echo ""
echo "Starting fetch..."
echo "--------------------------------------"

# Option 1: Using npm script (if defined)
if grep -q "fetch:data" package.json || grep -q "fetch-today" package.json; then
  echo "Using npm script..."
  DATE=$FETCH_DATE npm run fetch:data 2>&1 || DATE=$FETCH_DATE npm run fetch-today 2>&1 || echo "npm script failed"
else
  # Option 2: Direct Node.js execution
  echo "Running fetch job directly..."
  
  if [ -f "src/jobs/fetch-today.ts" ]; then
    # TypeScript file - use tsx or ts-node
    if command -v tsx &> /dev/null; then
      DATE=$FETCH_DATE tsx src/jobs/fetch-today.ts
    elif command -v ts-node &> /dev/null; then
      DATE=$FETCH_DATE ts-node src/jobs/fetch-today.ts
    else
      echo "❌ ERROR: tsx or ts-node not found"
      echo "Install with: npm install -g tsx"
      exit 1
    fi
  elif [ -f "src/jobs/fetch-today.js" ]; then
    # JavaScript file
    DATE=$FETCH_DATE node src/jobs/fetch-today.js
  else
    echo "❌ ERROR: fetch-today script not found"
    exit 1
  fi
fi

echo ""
echo "======================================"
echo "✅ Fetch completed!"
echo "======================================"
echo ""
echo "Now verify the data:"
echo "1. Run diagnostics: bash production-diagnostics-script.sh"
echo "2. Or check API: curl http://127.0.0.1:3001/api/earnings | head -c 500"
echo "3. Clear cache: curl -X POST http://127.0.0.1:3001/api/earnings/clear-cache"
echo ""

