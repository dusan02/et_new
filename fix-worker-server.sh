#!/bin/bash
# Fix worker on production server

echo "🔧 Fixing worker on production server..."

# Set environment variables
export NODE_ENV=production
export FINNHUB_API_KEY=d28f1dhr01qjsuf342ogd28f1dhr01qjsuf342p0
export POLYGON_API_KEY=Vi_pMLcusE8RA_SUvkPAmiyziVzlmOoX
export DATABASE_URL=file:./prisma/dev.db
export NEXT_TELEMETRY_DISABLED=1

# Go to application directory
cd /opt/earnings-table

echo "✅ Environment variables set"
echo "✅ Current directory: $(pwd)"

# Stop existing worker
echo "🛑 Stopping existing worker..."
pkill -f "worker-new.js" || echo "No existing worker to stop"

# Wait a moment
sleep 2

# Check if worker is stopped
if pgrep -f "worker-new.js" > /dev/null; then
    echo "❌ Worker still running, force killing..."
    pkill -9 -f "worker-new.js"
    sleep 2
fi

# Start worker fresh
echo "🚀 Starting worker fresh..."
nohup node src/queue/worker-new.js >> /var/log/earnings-worker.log 2>&1 &

# Wait a moment
sleep 3

# Check if worker is running
if pgrep -f "worker-new.js" > /dev/null; then
    echo "✅ Worker started successfully (PID: $(pgrep -f 'worker-new.js'))"
else
    echo "❌ Worker failed to start"
    echo "📝 Checking logs:"
    tail -20 /var/log/earnings-worker.log
    exit 1
fi

# Run initial fetch
echo "🔄 Running initial fetch..."
npm run fetch

# Wait a moment
sleep 5

# Check data
echo "📊 Data status:"
curl -s http://localhost:3000/api/earnings/stats | jq '.data.totalCompanies, .data.lastUpdated' || echo "API not responding"

echo "✅ Worker fix completed!"
