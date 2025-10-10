@echo off
echo 📊 Updating Earnings Table Data
echo ===============================

cd /d D:\Projects\EarningsTableUbuntu

echo 📡 Fetching latest data...
curl -s http://localhost:3000/api/earnings/update >nul 2>&1

echo 📈 Updating statistics...
curl -s http://localhost:3000/api/earnings/stats >nul 2>&1

echo 🔄 Refreshing cache...
curl -s http://localhost:3000/api/cache/refresh >nul 2>&1

echo ✅ Data update completed at %date% %time%
