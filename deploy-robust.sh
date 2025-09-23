#!/bin/bash

# Robust Production Deployment Script for EarningsTable
# Handles TERM signals and deployment issues properly

set -e  # Exit on any error

# Function to handle cleanup on exit
cleanup() {
    echo "🧹 Cleaning up..."
    # Kill any background processes
    jobs -p | xargs -r kill
    echo "✅ Cleanup completed"
}

# Set up signal handlers
trap cleanup EXIT INT TERM

echo "🚀 Starting robust EarningsTable deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# 1. Clean up any untracked files that might cause conflicts
echo "🧹 Cleaning up untracked files..."
git clean -fd

# 2. Stash any local changes
echo "💾 Stashing local changes..."
git stash

# 3. Pull latest changes from main branch
echo "📥 Pulling latest changes..."
git pull origin main

# 4. Install dependencies with better caching
echo "📦 Installing dependencies..."
npm ci --production=false --prefer-offline

# 5. Generate Prisma client
echo "🗄️ Generating Prisma client..."
npx prisma generate

# 6. Run database migrations
echo "🔄 Running database migrations..."
npx prisma db push

# 7. Build the application
echo "🏗️ Building application..."
npm run build

# 8. Stop any running Next.js processes gracefully
echo "🛑 Stopping existing processes..."
pkill -f "node.*next" || true
sleep 5

# 9. Create log directory if it doesn't exist
mkdir -p /var/log

# 10. Start the application with proper logging
echo "▶️ Starting application..."
nohup npm start > /var/log/earnings-table.log 2>&1 &
APP_PID=$!

# 11. Wait for application to start with timeout
echo "⏳ Waiting for application to start..."
for i in {1..30}; do
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Application started successfully!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Application failed to start within 30 seconds"
        echo "📋 Check logs: tail -f /var/log/earnings-table.log"
        exit 1
    fi
    sleep 1
done

# 12. Final health check
echo "🏥 Performing final health check..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Deployment completed successfully!"
    echo "🌐 Application available at: http://localhost:3000"
    echo "📋 Logs available at: /var/log/earnings-table.log"
    echo "🆔 Process ID: $APP_PID"
else
    echo "❌ Final health check failed"
    echo "📋 Check logs: tail -f /var/log/earnings-table.log"
    exit 1
fi

echo "🎉 Robust deployment completed successfully!"
