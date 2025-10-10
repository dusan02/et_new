#!/bin/bash

# 🔄 PRODUCTION ROLLBACK SCRIPT
# Rollback to previous version with Redis data recovery

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Get target commit/tag from argument
TARGET_COMMIT=${1:-"HEAD~1"}

log "Starting production rollback to: $TARGET_COMMIT"

# Step 1: Stop all PM2 processes
log "Stopping all PM2 processes..."
pm2 delete all || true

# Step 2: Backup current Redis data (if Redis is running)
log "Backing up current Redis data..."
if docker compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    TODAY=$(date +%Y-%m-%d)
    BACKUP_KEY="earnings:${TODAY}:backup"
    CURRENT_KEY="earnings:${TODAY}:published"
    
    # Create backup of current published data
    if docker compose exec -T redis redis-cli exists "$CURRENT_KEY" | grep -q "1"; then
        log "Creating backup of current published data..."
        docker compose exec -T redis redis-cli rename "$CURRENT_KEY" "$BACKUP_KEY"
        success "Backup created: $BACKUP_KEY"
    else
        warning "No current published data to backup"
    fi
else
    warning "Redis is not running, skipping backup"
fi

# Step 3: Checkout target commit/tag
log "Checking out target commit: $TARGET_COMMIT"
git checkout "$TARGET_COMMIT"

# Step 4: Install dependencies and build
log "Installing dependencies..."
npm ci

log "Building application..."
npm run build

# Step 5: Start PM2 processes
log "Starting PM2 processes..."
pm2 start pm2.config.cjs

# Save PM2 configuration
pm2 save

# Step 6: Restore Redis data if backup exists
log "Checking for Redis data restoration..."
if docker compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    TODAY=$(date +%Y-%m-%d)
    BACKUP_KEY="earnings:${TODAY}:backup"
    CURRENT_KEY="earnings:${TODAY}:published"
    
    if docker compose exec -T redis redis-cli exists "$BACKUP_KEY" | grep -q "1"; then
        log "Restoring Redis data from backup..."
        docker compose exec -T redis redis-cli rename "$BACKUP_KEY" "$CURRENT_KEY"
        success "Redis data restored from backup"
    else
        warning "No backup data found to restore"
    fi
fi

# Step 7: Health check
log "Running health check..."
sleep 5  # Wait for services to start

if curl -f -s http://localhost:3000/api/health > /dev/null; then
    success "Health endpoint is responding"
else
    error "Health endpoint is not responding after rollback"
    exit 1
fi

# Step 8: Final status
log "Final status check..."
pm2 status

success "Production rollback completed successfully!"
log "Application rolled back to: $TARGET_COMMIT"
log "Application is running on http://localhost:3000"

# Show current commit
CURRENT_COMMIT=$(git rev-parse --short HEAD)
log "Current commit: $CURRENT_COMMIT"