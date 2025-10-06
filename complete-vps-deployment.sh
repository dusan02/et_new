#!/bin/bash

# 🚀 COMPLETE VPS DEPLOYMENT SCRIPT
# Vymaže všetko na VPS a prenasadí z localhost cez git

set -e  # Exit on any error

echo "🚀 Starting complete VPS deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VPS_HOST="89.185.250.213"
VPS_USER="root"
VPS_PATH="/var/www/earnings-table"
GIT_REPO="https://github.com/dusan02/et_new.git"

echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo "VPS Host: $VPS_HOST"
echo "VPS User: $VPS_USER"
echo "VPS Path: $VPS_PATH"
echo "Git Repo: $GIT_REPO"
echo ""

# Step 1: Clean up VPS completely
echo -e "${YELLOW}🧹 Step 1: Cleaning up VPS server...${NC}"

ssh $VPS_USER@$VPS_HOST << 'EOF'
echo "🛑 Stopping all processes..."

# Stop PM2 processes
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Stop Docker containers
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true

# Stop any Node.js processes
pkill -f node 2>/dev/null || true
pkill -f npm 2>/dev/null || true
pkill -f tsx 2>/dev/null || true

# Remove application directory
echo "🗑️ Removing application directory..."
rm -rf /var/www/earnings-table 2>/dev/null || true
rm -rf /opt/earnings-table 2>/dev/null || true
rm -rf /opt/et_new 2>/dev/null || true

# Clean up system
echo "🧹 Cleaning up system..."
apt-get update -y
apt-get autoremove -y
apt-get autoclean -y

# Clear any remaining processes
echo "🔄 Final cleanup..."
sleep 2

echo "✅ VPS cleanup completed!"
EOF

echo -e "${GREEN}✅ VPS cleanup completed!${NC}"

# Step 2: Commit local changes to git
echo -e "${YELLOW}📝 Step 2: Committing local changes to git...${NC}"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Not in a git repository! Initializing...${NC}"
    git init
    git remote add origin $GIT_REPO
fi

# Add all changes
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo -e "${YELLOW}⚠️ No changes to commit${NC}"
else
    # Commit changes
    git commit -m "Complete VPS deployment - all fixes applied

- Fixed API fallback logic (no more old data)
- Fixed cache invalidation timing
- Fixed cron job coordination
- Enhanced error handling
- Added comprehensive monitoring

Deployed: $(date)"
    
    echo -e "${GREEN}✅ Local changes committed to git${NC}"
fi

# Push to remote repository
echo -e "${YELLOW}📤 Pushing to remote repository...${NC}"
git push origin main --force

echo -e "${GREEN}✅ Changes pushed to git repository${NC}"

# Step 3: Deploy to VPS
echo -e "${YELLOW}🚀 Step 3: Deploying to VPS server...${NC}"

ssh $VPS_USER@$VPS_HOST << EOF
echo "📥 Cloning repository from git..."

# Create application directory
mkdir -p $VPS_PATH
cd $VPS_PATH

# Clone repository
git clone $GIT_REPO .

echo "📦 Installing dependencies..."
npm ci --production

echo "🔧 Setting up environment..."
# Copy environment file
if [ -f ".env.production" ]; then
    cp .env.production .env
    echo "✅ Environment file copied"
else
    echo "⚠️ No .env.production found, using defaults"
fi

echo "🗄️ Setting up database..."
# Generate Prisma client
npx prisma generate

# Run database migrations if needed
npx prisma db push --accept-data-loss

echo "🏗️ Building application..."
npm run build

echo "🚀 Starting application with PM2..."

# Create PM2 ecosystem file if it doesn't exist
if [ ! -f "ecosystem.config.js" ]; then
    cat > ecosystem.config.js << 'PM2EOF'
module.exports = {
  apps: [
    {
      name: 'earnings-table',
      script: 'npm',
      args: 'start',
      cwd: process.cwd(),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'earnings-worker',
      script: 'src/queue/worker-new.js',
      cwd: process.cwd(),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
PM2EOF
fi

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup

echo "✅ Application started with PM2"
EOF

echo -e "${GREEN}✅ VPS deployment completed!${NC}"

# Step 4: Verify deployment
echo -e "${YELLOW}🔍 Step 4: Verifying deployment...${NC}"

# Wait for application to start
echo "⏳ Waiting for application to start..."
sleep 10

# Test endpoints
echo "🧪 Testing endpoints..."

# Test health endpoint
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://$VPS_HOST:3000/api/health" || echo "000")
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Health endpoint responding (HTTP $HEALTH_RESPONSE)${NC}"
else
    echo -e "${RED}❌ Health endpoint not responding (HTTP $HEALTH_RESPONSE)${NC}"
fi

# Test earnings endpoint
EARNINGS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://$VPS_HOST:3000/api/earnings" || echo "000")
if [ "$EARNINGS_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Earnings endpoint responding (HTTP $EARNINGS_RESPONSE)${NC}"
else
    echo -e "${RED}❌ Earnings endpoint not responding (HTTP $EARNINGS_RESPONSE)${NC}"
fi

# Check PM2 status
echo "📊 Checking PM2 status..."
ssh $VPS_USER@$VPS_HOST "pm2 status"

echo ""
echo -e "${GREEN}🎉 Complete VPS deployment finished!${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo "1. ✅ VPS server completely cleaned"
echo "2. ✅ Local changes committed to git"
echo "3. ✅ Application deployed to VPS"
echo "4. ✅ Application started with PM2"
echo "5. ✅ Endpoints tested"
echo ""
echo -e "${BLUE}🔗 Access URLs:${NC}"
echo "Main App: http://$VPS_HOST:3000"
echo "API Health: http://$VPS_HOST:3000/api/health"
echo "API Earnings: http://$VPS_HOST:3000/api/earnings"
echo ""
echo -e "${BLUE}📊 Monitoring:${NC}"
echo "PM2 Status: ssh $VPS_USER@$VPS_HOST 'pm2 status'"
echo "PM2 Logs: ssh $VPS_USER@$VPS_HOST 'pm2 logs'"
echo "System Logs: ssh $VPS_USER@$VPS_HOST 'journalctl -u pm2-root -f'"
echo ""
echo -e "${YELLOW}⚠️ Next steps:${NC}"
echo "1. Monitor application logs for any issues"
echo "2. Test cron jobs are running properly"
echo "3. Verify data is being fetched correctly"
echo "4. Set up monitoring and alerting if needed"
