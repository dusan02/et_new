@echo off
echo 🚀 Starting New Earnings Queue Worker with NY Timezone...
echo.

REM Stop any existing workers
echo 🔄 Stopping existing workers...
taskkill /f /im node.exe 2>nul

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Start the new worker
echo ✅ Starting new worker...
cd src\queue
npm start

pause
