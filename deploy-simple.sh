#!/bin/bash

# Simple and Reliable Production Deployment Script
# Avoids complex process management that causes TERM issues

set -e

echo "🚀 Starting simple deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    exit 1
fi

# 1. Clean and pull
echo "🧹 Cleaning and pulling latest changes..."
git clean -fd
git stash
git pull origin main

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# 3. Build application
echo "🏗️ Building application..."
npm run build

# 4. Simple process management
echo "🔄 Restarting application..."
# Kill any existing processes (ignore errors)
pkill -f "node.*next" 2>/dev/null || true
sleep 2

# Start new process
echo "▶️ Starting new application instance..."
nohup npm start > /var/log/earnings-table.log 2>&1 &
echo "Application started in background"

# 5. Quick health check
echo "🏥 Checking application health..."
sleep 5
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Deployment successful!"
    echo "🌐 Application running at http://localhost:3000"
else
    echo "⚠️ Health check failed, but deployment may still be starting"
    echo "📋 Check logs: tail -f /var/log/earnings-table.log"
fi

echo "🎉 Simple deployment completed!"
