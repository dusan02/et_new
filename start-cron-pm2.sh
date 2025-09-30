#!/bin/bash
# Start cron jobs with PM2 on production server

echo "🚀 Starting cron jobs with PM2 on production server..."

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

# Stop existing PM2 processes
echo "✅ Stopping existing PM2 processes..."
pm2 stop earningstable-cron 2>/dev/null || echo "No existing PM2 cron process"

# Run initial data fetch
echo "✅ Running initial data fetch..."
npm run fetch

# Start cron with PM2
echo "✅ Starting cron with PM2..."
pm2 start npm --name "earningstable-cron" -- run cron

# Save PM2 configuration
pm2 save

# Check PM2 status
echo "✅ PM2 status:"
pm2 status

echo "✅ Cron jobs started with PM2!"
echo "📊 Cron will fetch data every 30 minutes"
echo "🔍 Check status: pm2 status"
echo "📝 View logs: pm2 logs earningstable-cron"
