#!/bin/bash

# Fixed Production Deployment Script for EarningsTable
# This script handles git conflicts and untracked files properly

echo "🚀 Starting EarningsTable Production Deployment (Fixed Version)..."

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

# 4. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 5. Generate Prisma client
echo "🗄️ Generating Prisma client..."
npx prisma generate

# 6. Run database migrations
echo "🔄 Running database migrations..."
npx prisma db push

# 7. Build the application
echo "🏗️ Building application..."
npm run build

# 8. Stop any running Next.js processes
echo "🛑 Stopping existing processes..."
pkill -f "node.*next" || true
sleep 3

# 9. Start the application
echo "▶️ Starting application..."
npm start &

# 10. Wait for application to start
echo "⏳ Waiting for application to start..."
sleep 10

# 11. Health check
echo "🏥 Performing health check..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Application is running successfully!"
    echo "🌐 Application available at: http://localhost:3000"
else
    echo "❌ Health check failed. Application may not be running properly."
    echo "📋 Check logs for more information."
    exit 1
fi

echo "🎉 Deployment completed successfully!"
