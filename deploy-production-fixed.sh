#!/bin/bash

# Fixed Production Deployment Script
echo "=== DEPLOY CACHE FIXES ==="

cd /var/www/earnings-table

# Git pull
echo "Pulling latest changes..."
git pull origin main

# Clean and rebuild
echo "Cleaning and rebuilding..."
rm -rf .next
npx prisma generate
npm run build -- --no-lint

# Restart PM2
echo "Restarting PM2..."
pm2 restart earnings-table --update-env

# Wait for restart
echo "Waiting for restart..."
sleep 5

# Test endpoints
echo "=== TEST NOVÝCH ENDPOINTOV ==="
curl -s "https://earningstable.com/api/market/last-updated?t=$(date +%s)" | jq .

echo "=== TEST HEALTH ENDPOINT ==="
curl -sI "https://earningstable.com/api/health?t=$(date +%s)" | grep -iE 'cache|signature'

echo "=== TEST STATS ENDPOINT ==="
curl -s "https://earningstable.com/api/earnings/stats?t=$(date +%s)" | jq '.data.lastUpdated'

echo "=== PM2 STATUS ==="
pm2 status

echo "=== DEPLOYMENT COMPLETED ==="
