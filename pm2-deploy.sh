#!/bin/bash
# PM2 deployment script for earningstable.com

echo "🚀 PM2 deployment for earningstable.com..."

# Stop existing PM2 process
echo "✅ Stopping existing PM2 process..."
pm2 stop earningstable 2>/dev/null || echo "No existing PM2 process"

# Pull latest code
echo "✅ Pulling latest code..."
git pull origin main

# Install dependencies
echo "✅ Installing dependencies..."
npm ci --production

# Set environment variables
export NODE_ENV=production
export FINNHUB_API_KEY=d28f1dhr01qjsuf342ogd28f1dhr01qjsuf342p0
export POLYGON_API_KEY=Vi_pMLcusE8RA_SUvkPAmiyziVzlmOoX
export DATABASE_URL=file:./prisma/dev.db
export NEXT_TELEMETRY_DISABLED=1

# Setup database
echo "✅ Setting up database..."
npx prisma generate
npx prisma db push

# Start with PM2
echo "✅ Starting with PM2..."
pm2 start ecosystem-server.config.js

# Save PM2 configuration
pm2 save

# Test endpoints
echo "✅ Testing endpoints..."
sleep 5
curl -f http://localhost:3000/api/monitoring/health && echo "✅ Health check OK" || echo "❌ Health check failed"
curl -f http://localhost:3000/api/earnings && echo "✅ Earnings API OK" || echo "❌ Earnings API failed"

echo "✅ PM2 deployment completed!"
echo "📊 PM2 status:"
pm2 status
