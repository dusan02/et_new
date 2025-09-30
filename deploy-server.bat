@echo off
REM Server Deployment Script for earningstable.com
REM This script deploys the application to the production server

echo 🚀 Starting server deployment for earningstable.com...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ package.json not found. Please run this script from the project root.
    pause
    exit /b 1
)

echo ✅ Building application...
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Build failed! Please fix the issues before deploying.
    pause
    exit /b 1
)

echo ✅ Creating production environment file...
echo # Production Environment Variables > .env.production
echo NODE_ENV=production >> .env.production
echo FINNHUB_API_KEY=d28f1dhr01qjsuf342ogd28f1dhr01qjsuf342p0 >> .env.production
echo POLYGON_API_KEY=Vi_pMLcusE8RA_SUvkPAmiyziVzlmOoX >> .env.production
echo DATABASE_URL=file:./prisma/dev.db >> .env.production
echo NEXT_TELEMETRY_DISABLED=1 >> .env.production

echo ✅ Uploading to server...
echo 📤 Please manually upload the following files to your server:
echo    - .next/ (build output)
echo    - .env.production
echo    - package.json
echo    - package-lock.json
echo    - prisma/ (database files)
echo    - public/ (static files)

echo.
echo 🔧 Server setup commands (run on server):
echo    cd /path/to/your/app
echo    npm ci --production
echo    npx prisma generate
echo    npx prisma db push
echo    export NODE_ENV=production
echo    export FINNHUB_API_KEY=d28f1dhr01qjsuf342ogd28f1dhr01qjsuf342p0
echo    export POLYGON_API_KEY=Vi_pMLcusE8RA_SUvkPAmiyziVzlmOoX
echo    export DATABASE_URL=file:./prisma/dev.db
echo    npm start

echo.
echo 🌐 After deployment, your app will be available at:
echo    - http://89.185.250.213:3000
echo    - https://earningstable.com

echo.
echo Press any key to continue...
pause >nul
