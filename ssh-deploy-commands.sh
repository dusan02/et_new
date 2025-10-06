#!/bin/bash
# 🚀 PRODUCTION DEPLOYMENT COMMANDS
# Execute these commands on production server via SSH

echo "🚀 Starting production deployment..."

# 1. Navigate to project directory
cd /var/www/earnings-table

# 2. Stop PM2 processes
echo "🛑 Stopping PM2 processes..."
pm2 stop all

# 3. Pull latest changes from git
echo "📥 Pulling latest changes from git..."
git pull origin main

# 4. Copy production environment file
echo "📋 Setting up environment variables..."
cp production.env .env.production

# 5. Install dependencies (if needed)
echo "📦 Installing dependencies..."
npm install

# 6. Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# 7. Build the application
echo "🏗️ Building application..."
npm run build

# 8. Restart PM2 with new ecosystem config
echo "🔄 Restarting PM2 with new configuration..."
pm2 start ecosystem.config.js --env production

# 9. Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# 10. Check PM2 status
echo "📊 Checking PM2 status..."
pm2 status

# 11. Check logs
echo "📋 Checking recent logs..."
pm2 logs --lines 20

# 12. Test health endpoint
echo "🏥 Testing health endpoint..."
curl -s http://localhost:3001/api/health | jq .

# 13. Test cron status
echo "⏰ Checking cron status..."
pm2 describe earnings-cron

echo "✅ Deployment completed!"
echo "🔍 Next steps:"
echo "   - Check website: https://earningstable.com"
echo "   - Monitor logs: pm2 logs"
echo "   - Check health: curl -s https://earningstable.com/api/health"
echo "   - Verify tomorrow's reset at 2:00 AM NY time"
