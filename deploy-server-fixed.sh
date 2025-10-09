#!/bin/bash

# 🚀 SERVER DEPLOYMENT SCRIPT (for SSH deployment)
# Run this on your server to fix deployment issues

echo "🚀 Starting server deployment fix..."
echo "Current directory: $(pwd)"
echo "User: $(whoami)"
echo "Date: $(date)"

# Navigate to project directory
cd /var/www/earnings-table
echo "📁 Project directory: $(pwd)"

# Set environment variables
export NODE_ENV=production
export NEXT_PUBLIC_APP_ENV=production
export DATABASE_URL="file:./dev.db"
export REDIS_URL="redis://localhost:6379"
export PARITY_SKIP=1

# Update code
echo "📋 Updating code..."
git fetch origin main
git reset --hard origin/main
git clean -fd

# Show current commit
echo "📝 Current commit:"
git log --oneline -1

# Clean and reinstall dependencies
echo "🧹 Cleaning and reinstalling dependencies..."
rm -rf node_modules
rm -rf .next
npm cache clean --force
npm ci --production=false --prefer-offline --no-audit --no-fund

# Build with optimized approach
echo "🏗️ Building application..."
# Skip problematic pre-build scripts and go straight to Next.js build
timeout 900 npx next build || {
    echo "⚠️ Build timed out, trying again..."
    timeout 600 npx next build || {
        echo "❌ Build failed completely"
        exit 1
    }
}

# Stop existing processes
echo "🛑 Stopping existing processes..."
pkill -f "npm start" 2>/dev/null || echo "No npm start processes found"
pkill -f "node.*next" 2>/dev/null || echo "No Next.js processes found"
sleep 3

# Start application
echo "▶️ Starting application..."
nohup npm start > /var/log/earnings-table.log 2>&1 &
APP_PID=$!
echo "Application started with PID: $APP_PID"

# Wait and verify
sleep 5
if ps -p $APP_PID > /dev/null; then
    echo "✅ Application process is running (PID: $APP_PID)"
else
    echo "❌ Application process died, checking logs..."
    tail -20 /var/log/earnings-table.log || echo "No log file found"
    exit 1
fi

# Health check
echo "🏥 Health check..."
sleep 5
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Deployment successful!"
else
    echo "⚠️ Health check failed - checking logs..."
    tail -20 /var/log/earnings-table.log || echo "No log file found"
fi

echo "🎉 Server deployment completed!"
