@echo off
echo 🏥 Earnings Table Health Check
echo ==============================

cd /d D:\Projects\EarningsTableUbuntu

echo 🔍 Checking application health...
curl -s http://localhost:3000/api/health >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Application is healthy
) else (
    echo ❌ Application is not responding
    echo 🚀 Attempting to restart...
    call restart-app.bat
)

echo 🔍 Checking port 3000...
netstat -an | findstr :3000 >nul
if %errorlevel% == 0 (
    echo ✅ Port 3000 is active
) else (
    echo ❌ Port 3000 is not active
    echo 🚀 Starting application...
    call start-app.bat
)

echo ✅ Health check completed at %date% %time%
