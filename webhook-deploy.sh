#!/bin/bash

# Webhook Deployment Script for Earnings Table
# This script is triggered by GitHub webhook on push to main branch

set -e

echo "🚀 Starting webhook deployment..."
echo "📅 $(date)"

# Set working directory
cd /var/www/earnings-table

# 1. Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# 3. Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# 4. Build application
echo "🏗️ Building application..."
npm run build

# 5. Stop existing processes
echo "🛑 Stopping existing processes..."
pkill -f "next" 2>/dev/null || true
sleep 2

# 6. Start application
echo "▶️ Starting application..."
NODE_ENV=production nohup npm start > /var/log/earnings-table.log 2>&1 &

# 7. Wait for startup
echo "⏳ Waiting for application to start..."
sleep 10

# 8. Health check
echo "🏥 Performing health check..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Deployment successful!"
    echo "🌐 Application is running at http://localhost:3000"
else
    echo "⚠️ Health check failed, but deployment may still be starting"
    echo "📋 Check logs: tail -f /var/log/earnings-table.log"
fi

echo "🎉 Webhook deployment completed!"
echo "📅 $(date)"

