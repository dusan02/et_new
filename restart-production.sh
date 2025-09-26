#!/bin/bash

# Quick Production Restart Script
# Restarts the production server with latest cron fixes

set -e

echo "🔄 Restarting production server..."
echo "📅 $(date)"

# Navigate to application directory
cd /var/www/earnings-table

# 1. Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# 2. Stop existing processes
echo "🛑 Stopping existing processes..."
pkill -f "next" 2>/dev/null || true
pkill -f "npm start" 2>/dev/null || true
sleep 3

# 3. Quick dependency check
echo "📦 Checking dependencies..."
npm ci --production

# 4. Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# 5. Build application
echo "🏗️ Building application..."
npm run build

# 6. Start application
echo "▶️ Starting application..."
NODE_ENV=production nohup npm start > /var/log/earnings-table.log 2>&1 &

# 7. Restart Docker containers (cron worker)
echo "🐳 Restarting cron worker..."
docker-compose -f deployment/docker-compose.yml down cron-worker 2>/dev/null || true
docker-compose -f deployment/docker-compose.yml up -d cron-worker

# 8. Wait and health check
echo "⏳ Waiting for startup..."
sleep 10

echo "🏥 Health check..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Production restart successful!"
    echo "🌐 Application running at http://localhost:3000"
    echo "🌐 Public site: https://earningstable.com"
else
    echo "⚠️ Health check failed, checking logs..."
    tail -10 /var/log/earnings-table.log
fi

# 9. Show status
echo "📊 Current processes:"
ps aux | grep -E "(node|next)" | grep -v grep | head -5

echo "🐳 Docker containers:"
docker ps | grep earnings

echo "🎉 Production restart completed!"
echo "📅 $(date)"

