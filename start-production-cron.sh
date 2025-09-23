#!/bin/bash

# Start Production Cron Worker Script
# Run this on the production server to start earnings data collection

echo "🚀 Starting Production Cron Worker"
echo "================================="
echo "Server: 89.185.250.213"
echo "Date: $(date)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# 1. Check current directory
print_status "Current location: $(pwd)"
if [ ! -f "package.json" ]; then
    print_error "Not in the right directory. Navigate to /var/www/earnings-table first"
    exit 1
fi

# 2. Check if cron workers are already running
print_status "Checking for existing cron workers..."
EXISTING_WORKERS=$(ps aux | grep -E "(worker-new|simple-cron|production-cron)" | grep -v grep)
if [ ! -z "$EXISTING_WORKERS" ]; then
    print_warning "Found existing cron workers:"
    echo "$EXISTING_WORKERS"
    print_status "Stopping existing workers..."
    pkill -f "worker-new"
    pkill -f "simple-cron"
    pkill -f "production-cron"
    sleep 2
fi

# 3. Check which cron worker to use
print_status "Checking available cron workers..."
if [ -f "src/queue/worker-new.js" ]; then
    CRON_WORKER="src/queue/worker-new.js"
    print_success "Using intelligent worker: $CRON_WORKER"
elif [ -f "scripts/simple-cron.js" ]; then
    CRON_WORKER="scripts/simple-cron.js"
    print_success "Using simple worker: $CRON_WORKER"
else
    print_error "No cron worker found!"
    exit 1
fi

# 4. Check environment variables
print_status "Checking environment variables..."
source .env 2>/dev/null || true
source .env.local 2>/dev/null || true

if [ -z "$FINNHUB_API_KEY" ]; then
    print_warning "FINNHUB_API_KEY not set"
fi

if [ -z "$POLYGON_API_KEY" ]; then
    print_warning "POLYGON_API_KEY not set"
fi

# 5. Start the cron worker
print_status "Starting cron worker: $CRON_WORKER"
nohup node $CRON_WORKER > cron.log 2>&1 &
CRON_PID=$!

print_success "Cron worker started with PID: $CRON_PID"

# 6. Wait a moment and check if it's still running
sleep 5
if ps -p $CRON_PID > /dev/null; then
    print_success "Cron worker is running successfully!"
else
    print_error "Cron worker failed to start"
    print_status "Checking logs..."
    tail -n 20 cron.log
    exit 1
fi

# 7. Run immediate data fetch
print_status "Running immediate data fetch..."
if [ -f "scripts/fetch-data-now.js" ]; then
    node scripts/fetch-data-now.js
elif [ -f "src/jobs/fetch-today.ts" ]; then
    npx tsx src/jobs/fetch-today.ts
else
    print_warning "No immediate fetch script found"
fi

# 8. Show status
print_status "Final status check..."
echo ""
echo "🔍 Running processes:"
ps aux | grep -E "(node.*worker|node.*cron|node.*fetch)" | grep -v grep || echo "No cron processes found"
echo ""
echo "📋 Recent cron logs:"
tail -n 10 cron.log 2>/dev/null || echo "No cron logs yet"

print_success "🎉 Cron setup completed!"
echo ""
print_status "📊 Cron worker features:"
echo "   - Automatic earnings data fetching"
echo "   - Market hours scheduling"
echo "   - API rate limiting"
echo "   - Error handling and retries"
echo ""
print_status "📋 Monitoring commands:"
echo "   tail -f cron.log           # Watch cron logs"
echo "   ps aux | grep worker        # Check worker status"
echo "   kill $CRON_PID             # Stop cron worker"
echo "   node $CRON_WORKER &        # Restart cron worker"
echo ""
print_status "🌐 Check data updates at: http://89.185.250.213:3000"
