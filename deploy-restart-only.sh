#!/bin/bash

# Restart-Only Deployment Script
# For when you just need to restart the application without rebuilding

set -e

echo "🔄 Starting restart-only deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    exit 1
fi

# 1. Quick pull (no cleanup to avoid conflicts)
echo "📥 Pulling latest changes..."
git pull origin main

# 2. Skip build if .next directory exists and is recent
if [ -d ".next" ] && [ ".next" -nt "package.json" ]; then
    echo "✅ Build is up to date, skipping rebuild"
else
    echo "🏗️ Building application..."
    npm run build
fi

# 3. Quick restart
echo "🔄 Restarting application..."
pkill -f "node.*next" 2>/dev/null || true
sleep 2

echo "▶️ Starting application..."
nohup npm start > /var/log/earnings-table.log 2>&1 &
echo "Application restarted"

# 4. Quick health check
echo "🏥 Health check..."
sleep 3
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Restart successful!"
else
    echo "⚠️ Health check failed, but application may still be starting"
fi

echo "🎉 Restart-only deployment completed!"
