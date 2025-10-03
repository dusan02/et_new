#!/bin/bash

# 🚀 PRODUCTION DEPLOYMENT SCRIPT
# Deploys to https://earningstable.com and http://89.185.250.213:3000/

echo "🚀 Starting production deployment..."

# Server details
SERVER_IP="89.185.250.213"
SERVER_USER="root"
APP_DIR="/var/www/earnings-table"
BACKUP_DIR="/var/backups/earnings-table"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Deployment Checklist:${NC}"
echo "✅ Git repository updated"
echo "✅ Cron jobs cleaned up"
echo "✅ Worker-new.js integrated"
echo "✅ Cleanup script integrated"
echo "✅ Ecosystem.config.js updated"

echo -e "\n${YELLOW}🔧 Server Commands to Run:${NC}"
echo "Run these commands on the server (89.185.250.213):"

echo -e "\n${GREEN}1. SSH to server:${NC}"
echo "ssh root@89.185.250.213"

echo -e "\n${GREEN}2. Stop existing processes:${NC}"
echo "pm2 stop all"
echo "pm2 delete all"

echo -e "\n${GREEN}3. Navigate to app directory:${NC}"
echo "cd $APP_DIR"

echo -e "\n${GREEN}4. Pull latest changes:${NC}"
echo "git pull origin main"

echo -e "\n${GREEN}5. Install dependencies:${NC}"
echo "npm install"

echo -e "\n${GREEN}6. Build application:${NC}"
echo "npm run build"

echo -e "\n${GREEN}7. Setup environment:${NC}"
echo "cp production.env .env.local"

echo -e "\n${GREEN}8. Create logs directory:${NC}"
echo "mkdir -p logs"

echo -e "\n${GREEN}9. Start with PM2:${NC}"
echo "pm2 start ecosystem.config.js"

echo -e "\n${GREEN}10. Save PM2 configuration:${NC}"
echo "pm2 save"
echo "pm2 startup"

echo -e "\n${GREEN}11. Check status:${NC}"
echo "pm2 status"
echo "pm2 logs"

echo -e "\n${YELLOW}🌐 URLs to verify:${NC}"
echo "• https://earningstable.com"
echo "• http://89.185.250.213:3000"

echo -e "\n${YELLOW}📊 Monitoring:${NC}"
echo "• pm2 monit - real-time monitoring"
echo "• pm2 logs - view logs"
echo "• pm2 restart all - restart if needed"

echo -e "\n${GREEN}✅ Deployment script ready!${NC}"
echo "Run the commands above on the server to deploy."