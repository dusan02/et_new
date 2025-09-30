#!/bin/bash
# Manual data fetch for production server

echo "🚀 Manual data fetch for production server..."

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

# Check current data
echo "📊 Current data status:"
curl -s http://localhost:3000/api/earnings/stats | jq '.data.totalCompanies, .data.lastUpdated' || echo "API not responding"

# Run manual fetch
echo "🔄 Running manual data fetch..."
npm run fetch

# Wait a moment
sleep 5

# Check data after fetch
echo "📊 Data after fetch:"
curl -s http://localhost:3000/api/earnings/stats | jq '.data.totalCompanies, .data.lastUpdated' || echo "API not responding"

# Check if worker is running
echo "🔍 Worker status:"
ps aux | grep worker-new || echo "Worker not running"

# Check worker logs
echo "📝 Recent worker logs:"
tail -20 /var/log/earnings-worker.log || echo "No worker logs found"

echo "✅ Manual fetch completed!"
