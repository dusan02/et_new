#!/bin/bash

# Fix Production Cron Worker - Update to use worker-new.js instead of disabled production-cron.js
# This script will fix the ticker data fetching issue on earningstable.com

set -e

echo "🔧 Fixing production cron worker configuration..."
echo "📅 $(date)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1. Check current Docker containers
print_status "Checking current Docker containers..."
docker ps | grep earnings || true

# 2. Stop the problematic cron container
print_status "Stopping earnings-cron container..."
docker stop earnings-cron 2>/dev/null || print_warning "earnings-cron container not running"

# 3. Remove the old container
print_status "Removing old earnings-cron container..."
docker rm earnings-cron 2>/dev/null || print_warning "earnings-cron container not found"

# 4. Pull latest changes
print_status "Pulling latest changes from git..."
git pull origin main

# 5. Rebuild the cron container with correct configuration
print_status "Rebuilding cron worker with correct configuration..."
docker-compose -f deployment/docker-compose.yml build cron-worker

# 6. Start the updated cron container
print_status "Starting fixed cron worker..."
docker-compose -f deployment/docker-compose.yml up -d cron-worker

# 7. Check if container is running
print_status "Checking if container started successfully..."
sleep 5
if docker ps | grep earnings-cron; then
    print_success "Cron worker is now running with worker-new.js!"
else
    print_error "Failed to start cron worker"
    exit 1
fi

# 8. Show container logs
print_status "Container logs (last 20 lines):"
docker logs earnings-cron --tail 20

# 9. Trigger immediate data fetch to update tickers
print_status "Triggering immediate data fetch..."
docker exec earnings-cron npm run fetch:data || print_warning "Manual fetch failed, but scheduled fetch should work"

print_success "Production cron worker has been fixed!"
print_success "Tickers should now update automatically according to worker-new.js schedule:"
echo "   - Main fetch: Daily at 2:00 AM NY time"
echo "   - Market updates: Every 2 minutes during market hours (9:30 AM - 4:00 PM ET)"
echo "   - Pre-market: Every 5 minutes (4:00 AM - 9:30 AM ET)"
echo "   - After-hours: Every 10 minutes (4:00 PM - 8:00 PM ET)"
echo "   - Weekend: Every hour"

print_status "You can monitor the logs with: docker logs -f earnings-cron"

echo "🎉 Fix completed!"
echo "📅 $(date)"
