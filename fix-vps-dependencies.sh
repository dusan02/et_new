#!/bin/bash
echo "🔧 Fixing VPS dependencies..."

# Navigate to project directory
cd /var/www/earnings-table

# Stop PM2 processes
pm2 stop all

# Remove node_modules and package-lock.json
rm -rf node_modules
rm -f package-lock.json

# Clear npm cache
npm cache clean --force

# Install dependencies fresh
npm install

# Generate Prisma client
npx prisma generate

# Build the application
npm run build

# Start PM2 processes
pm2 start ecosystem.config.js

# Check status
pm2 status

echo "✅ Dependencies fixed!"
