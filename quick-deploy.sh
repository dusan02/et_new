#!/bin/bash
# Quick deployment script for earningstable.com server
# Run this on the server to deploy the latest code

echo "🚀 Quick deployment for earningstable.com..."

# Stop existing application
echo "✅ Stopping existing application..."
pkill -f "npm start" || echo "No npm processes to stop"
pkill -f "node.*next" || echo "No node processes to stop"

# Pull latest code
echo "✅ Pulling latest code from Git..."
git pull origin main

# Install dependencies
echo "✅ Installing dependencies..."
npm ci --production

# Set environment variables
echo "✅ Setting environment variables..."
export NODE_ENV=production
export FINNHUB_API_KEY=d28f1dhr01qjsuf342ogd28f1dhr01qjsuf342p0
export POLYGON_API_KEY=Vi_pMLcusE8RA_SUvkPAmiyziVzlmOoX
export DATABASE_URL=file:./prisma/dev.db
export NEXT_TELEMETRY_DISABLED=1

# Setup database
echo "✅ Setting up database..."
npx prisma generate
npx prisma db push

# Start application
echo "✅ Starting application..."
nohup npm start > app.log 2>&1 &

# Wait a moment
sleep 5

# Test endpoints
echo "✅ Testing endpoints..."
curl -f http://localhost:3000/api/monitoring/health && echo "✅ Health check OK" || echo "❌ Health check failed"
curl -f http://localhost:3000/api/earnings && echo "✅ Earnings API OK" || echo "❌ Earnings API failed"
curl -f http://localhost:3000/api/earnings/stats && echo "✅ Stats API OK" || echo "❌ Stats API failed"

echo "✅ Deployment completed!"
echo "🌐 Application should be available at:"
echo "   - http://89.185.250.213:3000"
echo "   - https://earningstable.com"
