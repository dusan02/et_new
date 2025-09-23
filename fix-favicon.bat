@echo off
echo 🔧 Fixing Favicon (Removing N-ko icon)
echo ======================================
echo 📅 Date: %date% %time%
echo.

REM Configuration
set SERVER=root@89.185.250.213
set APP_DIR=/var/www/earnings-table

echo 🚀 Deploying favicon fix to production...
echo.

REM 1. Copy fixed files to server
echo 📤 Uploading fixed files...
scp src/app/layout.tsx %SERVER%:%APP_DIR%/src/app/
scp public/favicon.ico %SERVER%:%APP_DIR%/public/

REM 2. Build and restart application
echo 🔨 Building application on server...
ssh %SERVER% "cd /var/www/earnings-table && pkill -f 'next' || true && sleep 2 && npm run build && npm start &"

echo.
echo 🎉 Favicon fix deployed successfully!
echo 🚫 N-ko icon should be removed
echo 🌐 URL: https://earningstable.com
echo.
echo 📋 Changes made:
echo   • Removed Next.js default favicon reference
echo   • Added custom favicon.ico based on calendar design
echo   • Updated layout.tsx to use proper favicon
echo.
pause
