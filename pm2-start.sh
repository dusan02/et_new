#!/bin/bash
# PM2 startup wrapper - loads .env.production and starts all processes

set -e

cd /var/www/earnings-table

echo "🔐 Loading environment from .env.production..."
set -a
source <(tr -d '\r' < .env.production)
set +a

echo "🚀 Starting PM2 processes..."
pm2 start ecosystem.production.config.js --env production

echo "💾 Saving PM2 configuration..."
pm2 save

echo ""
echo "✅ PM2 processes started successfully!"
echo ""
pm2 status

