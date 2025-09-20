#!/bin/bash

# Webhook Deployment Script for EarningsTable
# This will run on the server when GitHub sends a webhook

set -e

echo "🚀 Starting webhook deployment..."

# Configuration
REPO_URL="https://github.com/dusan02/et_new.git"
APP_DIR="/var/www/earnings-table"
BACKUP_DIR="/var/backups/earnings-table"

# Create backup
echo "📦 Creating backup..."
mkdir -p $BACKUP_DIR
if [ -d "$APP_DIR" ]; then
    cp -r $APP_DIR $BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S)
fi

# Stop services
echo "⏹️ Stopping services..."
cd $APP_DIR 2>/dev/null || true
docker-compose -f deployment/docker-compose.yml down 2>/dev/null || true

# Clone/update repository
echo "📥 Updating repository..."
if [ -d "$APP_DIR" ]; then
    cd $APP_DIR
    git fetch origin
    git reset --hard origin/main
    git clean -fd
else
    mkdir -p $(dirname $APP_DIR)
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

# Copy required files for Docker
echo "📋 Setting up Docker environment..."
cp src/queue/package*.json ./
cp production.env .env

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f deployment/docker-compose.yml up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services..."
sleep 30

# Health check
echo "🏥 Running health check..."
if curl -f http://localhost:3000/api/earnings > /dev/null 2>&1; then
    echo "✅ Deployment successful!"
    echo "🌐 Application is running at http://89.185.250.213:3000"
else
    echo "❌ Health check failed"
    exit 1
fi

echo "🎉 Webhook deployment completed!"
