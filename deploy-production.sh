#!/bin/bash

# Production Deployment Script
set -e

echo "🚀 Starting production deployment..."

# 1. Environment check
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production not found. Please create it from env.production.example"
    exit 1
fi

# 2. Load production environment
export $(cat .env.production | grep -v '^#' | xargs)

# 3. Verify required environment variables
required_vars=("DATABASE_URL" "REDIS_URL" "POLYGON_API_KEY" "FINNHUB_API_KEY")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# 4. Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# 5. Build application
echo "🔨 Building application..."
npm run build

# 6. Database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# 7. Create logs directory
mkdir -p logs

# 8. Stop existing PM2 processes
echo "🛑 Stopping existing processes..."
pm2 stop ecosystem.production.config.js || true
pm2 delete ecosystem.production.config.js || true

# 9. Start Redis (if not running)
echo "🔴 Starting Redis..."
docker-compose up -d redis || echo "Redis already running"

# 10. Wait for Redis
echo "⏳ Waiting for Redis..."
sleep 5

# 11. Start application with PM2
echo "🚀 Starting application..."
pm2 start ecosystem.production.config.js

# 12. Save PM2 configuration
pm2 save

# 13. Setup PM2 startup
pm2 startup || echo "PM2 startup already configured"

# 14. Initial data publish
echo "📊 Publishing initial data..."
node scripts/publish-static.js || echo "Static publish failed, will be handled by workers"

echo "✅ Production deployment completed!"
echo "📊 Check status: pm2 status"
echo "📋 View logs: pm2 logs"
echo "🌐 Application: http://localhost:3000"
echo "💊 Health check: http://localhost:3000/api/health"
echo "📈 DQ status: http://localhost:3000/api/dq"