@echo off
REM 🚀 PRODUCTION DEPLOYMENT SCRIPT
REM Deploys to https://earningstable.com and http://89.185.250.213:3000/

echo 🚀 Starting production deployment...

echo.
echo 📋 Deployment Checklist:
echo ✅ Git repository updated
echo ✅ Cron jobs cleaned up  
echo ✅ Worker-new.js integrated
echo ✅ Cleanup script integrated
echo ✅ Ecosystem.config.js updated

echo.
echo 🔧 Server Commands to Run:
echo Run these commands on the server (89.185.250.213):

echo.
echo 1. SSH to server:
echo ssh root@89.185.250.213

echo.
echo 2. Stop existing processes:
echo pm2 stop all
echo pm2 delete all

echo.
echo 3. Navigate to app directory:
echo cd /var/www/earnings-table

echo.
echo 4. Pull latest changes:
echo git pull origin main

echo.
echo 5. Install dependencies:
echo npm install

echo.
echo 6. Build application:
echo npm run build

echo.
echo 7. Setup environment:
echo cp production.env .env.local

echo.
echo 8. Create logs directory:
echo mkdir -p logs

echo.
echo 9. Start with PM2:
echo pm2 start ecosystem.config.js

echo.
echo 10. Save PM2 configuration:
echo pm2 save
echo pm2 startup

echo.
echo 11. Check status:
echo pm2 status
echo pm2 logs

echo.
echo 🌐 URLs to verify:
echo • https://earningstable.com
echo • http://89.185.250.213:3000

echo.
echo 📊 Monitoring:
echo • pm2 monit - real-time monitoring
echo • pm2 logs - view logs
echo • pm2 restart all - restart if needed

echo.
echo ✅ Deployment script ready!
echo Run the commands above on the server to deploy.

pause