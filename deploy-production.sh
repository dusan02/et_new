#!/bin/bash

# 🔧 PRODUCTION DEPLOY SCRIPT - IDEMPOTENT
# Zabezpečuje 1:1 paritu s localhost prostredím

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

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    error ".env.production file not found!"
    error "Please copy env.production.example to .env.production and fill in real values"
    exit 1
fi

log "Starting production deployment..."

# Step 1: Start Redis with Docker Compose
log "Starting Redis with Docker Compose..."
docker compose up -d redis

# Wait for Redis to be ready
log "Waiting for Redis to be ready..."
for i in {1..30}; do
    if docker compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        success "Redis is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        error "Redis failed to start after 30 seconds"
        exit 1
    fi
    sleep 1
done

# Step 2: Install dependencies
log "Installing dependencies..."
npm ci

# Step 3: Deploy database migrations
log "Deploying database migrations..."
npx prisma migrate deploy

# Step 4: Build application
log "Building application..."
npm run build

# Step 5: Parity check
log "Running parity check..."
npm run parity:check

# Step 6: Start/restart PM2 processes
log "Starting PM2 processes..."
if pm2 list | grep -q "web\|scheduler\|watchdog"; then
    log "Restarting existing PM2 processes..."
    pm2 restart pm2.config.cjs
else
    log "Starting new PM2 processes..."
    pm2 start pm2.config.cjs
fi

# Save PM2 configuration
pm2 save

# Step 7: Warm-up (one-shot runs)
log "Running warm-up processes..."

# Process prices
log "Processing prices..."
npm run process:prices

# Process EPS/Revenue (optional based on time)
current_hour=$(date +%H)
if [ "$current_hour" -ge 16 ]; then
    log "Processing EPS/Revenue (after 4 PM ET)..."
    npm run process:epsrev
else
    warning "Skipping EPS/Revenue processing (before 4 PM ET)"
fi

# Publish attempt
log "Attempting to publish data..."
npm run publish:attempt

# Step 8: Smoke test
log "Running smoke test..."
npm run smoke:test

# Step 8.5: Production sanity check
log "Running production sanity check..."
node scripts/production-sanity-check.js

# Step 9: Final status check
log "Checking final status..."

# PM2 status
log "PM2 Status:"
pm2 status

# Health check
log "Health check:"
if curl -f -s http://localhost:3000/api/health > /dev/null; then
    success "Health endpoint is responding"
else
    error "Health endpoint is not responding"
    exit 1
fi

# Earnings endpoint check
log "Earnings endpoint check:"
if curl -f -s http://localhost:3000/api/earnings/today > /dev/null; then
    success "Earnings endpoint is responding"
else
    warning "Earnings endpoint is not responding (may be normal if no data)"
fi

success "Production deployment completed successfully!"
log "Application is running on http://localhost:3000"
log "PM2 processes: web, scheduler, watchdog"
log "Redis is running on port 6379"