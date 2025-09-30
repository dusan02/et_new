@echo off
REM Quick deployment script for earningstable.com server
REM Run this on the server to deploy the latest code

echo 🚀 Quick deployment for earningstable.com...

REM Stop existing application
echo ✅ Stopping existing application...
taskkill /F /IM node.exe 2>nul || echo No Node.js processes to stop

REM Pull latest code
echo ✅ Pulling latest code from Git...
git pull origin main

REM Install dependencies
echo ✅ Installing dependencies...
npm ci --production

REM Set environment variables
echo ✅ Setting environment variables...
set NODE_ENV=production
set FINNHUB_API_KEY=d28f1dhr01qjsuf342ogd28f1dhr01qjsuf342p0
set POLYGON_API_KEY=Vi_pMLcusE8RA_SUvkPAmiyziVzlmOoX
set DATABASE_URL=file:./prisma/dev.db
set NEXT_TELEMETRY_DISABLED=1

REM Setup database
echo ✅ Setting up database...
npx prisma generate
npx prisma db push

REM Start application
echo ✅ Starting application...
start /B npm start

REM Wait a moment
timeout /t 5 /nobreak >nul

REM Test endpoints
echo ✅ Testing endpoints...
curl -f http://localhost:3000/api/monitoring/health && echo ✅ Health check OK || echo ❌ Health check failed
curl -f http://localhost:3000/api/earnings && echo ✅ Earnings API OK || echo ❌ Earnings API failed
curl -f http://localhost:3000/api/earnings/stats && echo ✅ Stats API OK || echo ❌ Stats API failed

echo ✅ Deployment completed!
echo 🌐 Application should be available at:
echo    - http://89.185.250.213:3000
echo    - https://earningstable.com

pause
