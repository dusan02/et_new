#!/bin/bash

echo "🔧 Fixing Mobile Search Bar Issues"
echo "=================================="
echo "📅 Date: $(date)"
echo ""

# Configuration
SERVER="root@89.185.250.213"
APP_DIR="/var/www/earnings-table"

echo "🚀 Deploying mobile search fixes to production..."

# 1. Copy fixed files to server
echo "📤 Uploading fixed files..."
scp src/components/EarningsTable.tsx $SERVER:$APP_DIR/src/components/
scp src/app/globals.css $SERVER:$APP_DIR/src/app/

# 2. Build and restart application
echo "🔨 Building application on server..."
ssh $SERVER << 'EOF'
cd /var/www/earnings-table

# Stop current processes
pkill -f "next" || true
sleep 2

# Install dependencies and build
npm ci --production
npx prisma generate
npm run build

# Start production server
npm start &
sleep 5

# Verify server is running
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Server is running on port 3000"
else
    echo "❌ Server failed to start"
    exit 1
fi
EOF

echo ""
echo "🎉 Mobile search fixes deployed successfully!"
echo "📱 Test the search functionality on mobile devices"
echo "🌐 URL: https://earningstable.com"
echo ""
echo "📋 Changes made:"
echo "  • Added explicit text color for mobile inputs"
echo "  • Fixed iOS zoom prevention (font-size: 16px)"
echo "  • Enhanced focus states for mobile"
echo "  • Added min-height for better touch targets"
echo "  • Improved CSS specificity with !important"
