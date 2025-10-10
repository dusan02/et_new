@echo off
echo 🚀 Starting Earnings Table Application
echo =====================================

cd /d D:\Projects\EarningsTableUbuntu

echo Checking if application is already running...
netstat -an | findstr :3000 >nul
if %errorlevel% == 0 (
    echo ✅ Application is already running on port 3000
    echo Opening browser...
    start http://localhost:3000
) else (
    echo 🚀 Starting application...
    npm start
)

echo ✅ Start script completed
