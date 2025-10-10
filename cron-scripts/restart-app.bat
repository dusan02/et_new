@echo off
echo 🔄 Restarting Earnings Table Application
echo ========================================

cd /d D:\Projects\EarningsTableUbuntu

echo 🛑 Stopping existing processes...
taskkill /f /im node.exe 2>nul
timeout /t 3 /nobreak >nul

echo 🚀 Starting application...
npm start

echo ✅ Restart script completed
