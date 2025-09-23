@echo off
echo 🔧 Fixing Mobile Search Bar Issues
echo ==================================
echo 📅 Date: %date% %time%
echo.

REM Configuration
set SERVER=root@89.185.250.213
set APP_DIR=/var/www/earnings-table

echo 🚀 Deploying mobile search fixes to production...
echo.

REM 1. Copy fixed files to server
echo 📤 Uploading fixed files...
scp src/components/EarningsTable.tsx %SERVER%:%APP_DIR%/src/components/
scp src/app/globals.css %SERVER%:%APP_DIR%/src/app/

REM 2. Build and restart application
echo 🔨 Building application on server...
ssh %SERVER% "cd /var/www/earnings-table && pkill -f 'next' || true && sleep 2 && npm ci --production && npx prisma generate && npm run build && npm start &"

echo.
echo 🎉 Mobile search fixes deployed successfully!
echo 📱 Test the search functionality on mobile devices
echo 🌐 URL: https://earningstable.com
echo.
echo 📋 Changes made:
echo   • Added explicit text color for mobile inputs
echo   • Fixed iOS zoom prevention (font-size: 16px)
echo   • Enhanced focus states for mobile
echo   • Added min-height for better touch targets
echo   • Improved CSS specificity with !important
echo.
pause
