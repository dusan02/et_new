@echo off
REM Production Deployment Script for EarningsTable (Windows)
REM Run this script to deploy to production

echo 🚀 Starting EarningsTable Production Deployment...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from the project root.
    pause
    exit /b 1
)

REM 1. Install dependencies
echo 📦 Installing dependencies...
call npm ci --production

REM 2. Generate Prisma client
echo 🗄️ Generating Prisma client...
call npx prisma generate

REM 3. Run database migrations
echo 🔄 Running database migrations...
call npx prisma db push

REM 4. Build the application
echo 🏗️ Building application...
call npm run build

REM 5. Create production directory structure
echo 📁 Creating production structure...
if not exist "production" mkdir production
if not exist "production\logs" mkdir production\logs
if not exist "production\data" mkdir production\data
if not exist "production\backups" mkdir production\backups

REM 6. Copy production files
echo 📋 Copying production files...
xcopy /E /I .next production\.next
xcopy /E /I public production\public
xcopy /E /I prisma production\prisma
copy package.json production\
copy package-lock.json production\
copy next.config.js production\
copy production.env production\.env.local

echo ✅ Production deployment package created in 'production/' directory
echo 📋 Next steps:
echo 1. Copy 'production/' directory to your server
echo 2. Follow instructions in production/DEPLOYMENT.md
echo 3. Update environment variables in production/.env.local
echo 4. Configure your domain and SSL certificates
echo.
echo 🎉 Deployment package ready!
pause
