@echo off
REM Production Deployment Script for earningstable.com (Windows)
REM Server: 89.185.250.213:3000

echo 🚀 Starting production deployment for earningstable.com...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ package.json not found. Please run this script from the project root.
    pause
    exit /b 1
)

echo ✅ Stopping existing application...
taskkill /F /IM node.exe 2>nul || echo No Node.js processes to stop

echo ✅ Pulling latest changes from Git...
git pull origin main

echo ✅ Installing dependencies...
npm ci --production

echo ✅ Running pre-build validation...
npm run build

if %errorlevel% neq 0 (
    echo ❌ Build failed! Please fix the issues before deploying.
    pause
    exit /b 1
)

echo ✅ Setting up environment variables...
if not exist ".env.production" (
    echo ⚠️ .env.production not found. Please create it with your production settings.
    copy env.production.example .env.production
    echo ⚠️ Please edit .env.production with your actual values before continuing.
    pause
    exit /b 1
)

echo ✅ Starting application...
start /B npm start

echo ✅ Running initial data fetch...
npm run fetch

echo ✅ Starting cron jobs...
start /B npm run cron

echo ✅ Checking application health...
timeout /t 5 /nobreak >nul
curl -f http://localhost:3000/api/monitoring/health || echo ⚠️ Health check failed

echo ✅ Production deployment completed!
echo 🌐 Application URL: https://earningstable.com
echo 📊 Health Check: http://89.185.250.213:3000/api/monitoring/health
echo 📈 Data will be refreshed every 30 minutes

echo.
echo Press any key to continue...
pause >nul
