#!/bin/bash

# 💾 Data Backup Script
# Create backups before major operations

set -e

echo "💾 Starting data backup..."

# Create backup directory
mkdir -p backups/$(date +%Y%m%d)

# Database backup
if [ -f "prisma/dev.db" ]; then
    echo "📊 Backing up database..."
    cp prisma/dev.db backups/$(date +%Y%m%d)/dev.db.$(date +%H%M%S)
    echo "✅ Database backed up"
else
    echo "⚠️  Database file not found"
fi

# Redis backup (if available)
if command -v redis-cli &> /dev/null; then
    echo "📊 Backing up Redis data..."
    
    # Backup current data
    if redis-cli GET earnings:today &> /dev/null; then
        redis-cli GET earnings:today > backups/$(date +%Y%m%d)/earnings-today.$(date +%H%M%S).json
        echo "✅ Redis current data backed up"
    fi
    
    # Backup published data
    if redis-cli GET earnings:2025-10-10:published &> /dev/null; then
        redis-cli GET earnings:2025-10-10:published > backups/$(date +%Y%m%d)/earnings-published.$(date +%H%M%S).json
        echo "✅ Redis published data backed up"
    fi
else
    echo "⚠️  Redis not available, skipping Redis backup"
fi

# Environment backup
if [ -f ".env" ]; then
    echo "🔧 Backing up environment..."
    cp .env backups/$(date +%Y%m%d)/.env.$(date +%H%M%S)
    echo "✅ Environment backed up"
fi

# Cleanup old backups (keep last 7 days)
echo "🧹 Cleaning up old backups..."
find backups -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true

echo "🎉 Backup completed!"
echo "📁 Backups stored in: backups/$(date +%Y%m%d)/"
