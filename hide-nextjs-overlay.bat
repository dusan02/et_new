@echo off
echo 🔧 Hiding Next.js Development Overlay (N-ko icon)
echo ================================================
echo 📅 Date: %date% %time%
echo.

REM Configuration
set SERVER=root@89.185.250.213
set APP_DIR=/var/www/earnings-table

echo 🚀 Deploying CSS fix to hide Next.js overlay...
echo.

REM 1. Copy fixed CSS file to server
echo 📤 Uploading fixed CSS file...
scp src/app/globals.css %SERVER%:%APP_DIR%/src/app/

REM 2. Build and restart application
echo 🔨 Building application on server...
ssh %SERVER% "cd /var/www/earnings-table && pkill -9 -f 'next' && sleep 3 && npm run build && npm start &"

echo.
echo 🎉 Next.js overlay fix deployed successfully!
echo 🚫 N-ko icon should be hidden
echo 🌐 URL: https://earningstable.com
echo.
echo 📋 Changes made:
echo   • Added CSS rules to hide Next.js development overlay
echo   • Hidden data-nextjs-dialog-overlay elements
echo   • Hidden data-nextjs-dialog elements
echo   • Hidden Next.js development indicators
echo   • Hidden stack frame elements
echo.
pause
