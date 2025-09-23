@echo off
echo 🚀 Final Deploy - Mobile Search + Next.js Overlay Fixes
echo ======================================================
echo 📅 Date: %date% %time%
echo.

REM Configuration
set SERVER=root@89.185.250.213
set APP_DIR=/var/www/earnings-table

echo 🔧 Deploying both fixes to production...
echo.

REM 1. Copy fixed files to server
echo 📤 Uploading fixed files...
scp src/components/EarningsTable.tsx %SERVER%:%APP_DIR%/src/components/
scp src/app/globals.css %SERVER%:%APP_DIR%/src/app/

REM 2. Build and restart application
echo 🔨 Building application on server...
ssh %SERVER% "cd /var/www/earnings-table && pkill -9 -f 'next' && sleep 3 && npm run build && npm start &"

echo.
echo 🎉 All fixes deployed successfully!
echo 📱 Mobile search bar should now be visible
echo 🚫 Next.js overlay should be hidden
echo 🌐 URL: https://earningstable.com
echo.
echo 📋 Changes made:
echo   ✅ Enhanced mobile search bar styles
echo   ✅ Fixed text visibility with !important rules
echo   ✅ Added border and padding for better visibility
echo   ✅ Hidden Next.js development overlay
echo   ✅ Force dark text on white background
echo   ✅ Improved focus states for mobile
echo.
pause
