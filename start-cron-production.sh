#!/bin/bash
# Start cron jobs on production server

echo "🚀 Starting cron jobs on production server..."

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

# Stop existing cron processes
echo "✅ Stopping existing cron processes..."
pkill -f "simple-cron.js" || echo "No existing cron processes to stop"
pkill -f "fetch-data-now.js" || echo "No existing fetch processes to stop"

# Run initial data fetch
echo "✅ Running initial data fetch..."
npm run fetch

# Start cron scheduler
echo "✅ Starting cron scheduler..."
nohup npm run cron > /var/log/earnings-cron.log 2>&1 &

# Wait a moment
sleep 3

# Check if cron is running
if pgrep -f "simple-cron.js" > /dev/null; then
    echo "✅ Cron scheduler is running (PID: $(pgrep -f 'simple-cron.js'))"
else
    echo "❌ Cron scheduler failed to start"
    exit 1
fi

# Test data fetch
echo "✅ Testing data fetch..."
npm run fetch

echo "✅ Cron jobs started successfully!"
echo "📊 Cron will fetch data every 30 minutes"
echo "📝 Logs: /var/log/earnings-cron.log"
echo "🔍 Check status: ps aux | grep simple-cron"
