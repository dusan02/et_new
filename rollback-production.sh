#!/bin/bash

# Production Rollback Script
set -e

echo "🔄 Starting production rollback..."

# 1. Load production environment
export $(cat .env.production | grep -v '^#' | xargs)

# 2. Get Redis connection
REDIS_URL=${REDIS_URL:-"redis://localhost:6379"}

# 3. Rollback to previous published snapshot
echo "📊 Rolling back to previous snapshot..."

# Get current day
DAY=$(date +%Y-%m-%d)

# Check if previous snapshot exists
if redis-cli -u "$REDIS_URL" exists "earnings:${DAY}:published:prev" | grep -q "1"; then
    echo "✅ Previous snapshot found, rolling back..."
    
    # Atomic rollback: prev -> published
    redis-cli -u "$REDIS_URL" rename "earnings:${DAY}:published:prev" "earnings:${DAY}:published"
    
    # Update meta
    redis-cli -u "$REDIS_URL" set "earnings:latest:meta" "$(redis-cli -u "$REDIS_URL" get "earnings:${DAY}:published:meta:prev")"
    
    echo "✅ Rollback completed successfully"
else
    echo "❌ No previous snapshot found for rollback"
    exit 1
fi

# 4. Restart workers to pick up changes
echo "🔄 Restarting workers..."
pm2 restart earnings-watchdog
pm2 restart earnings-scheduler

echo "✅ Rollback completed!"
echo "📊 Check status: pm2 status"
echo "🌐 Application: http://localhost:3000"
