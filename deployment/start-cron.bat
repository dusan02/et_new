@echo off
echo 🚀 Starting Earnings Cron Worker...
echo.

cd /d "%~dp0src\queue"

echo 📁 Current directory: %CD%
echo.

echo 🔄 Starting worker-new.js...
node worker-new.js

pause
