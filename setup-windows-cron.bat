@echo off
echo 🕐 Setting up Windows Cron Jobs for Earnings Table
echo ================================================

REM Create scheduled tasks for the application
echo Creating scheduled tasks...

REM Task 1: Start application daily at 6:00 AM
schtasks /create /tn "EarningsTable-Start" /tr "cd /d D:\Projects\EarningsTableUbuntu && npm start" /sc daily /st 06:00 /f

REM Task 2: Restart application daily at 2:00 AM
schtasks /create /tn "EarningsTable-Restart" /tr "cd /d D:\Projects\EarningsTableUbuntu && npm run restart" /sc daily /st 02:00 /f

REM Task 3: Update data every hour
schtasks /create /tn "EarningsTable-UpdateData" /tr "cd /d D:\Projects\EarningsTableUbuntu && npm run update-data" /sc hourly /f

REM Task 4: Health check every 30 minutes
schtasks /create /tn "EarningsTable-HealthCheck" /tr "cd /d D:\Projects\EarningsTableUbuntu && npm run health-check" /sc minute /mo 30 /f

echo ✅ Windows cron jobs created successfully!
echo.
echo 📋 Created tasks:
echo - EarningsTable-Start (Daily at 6:00 AM)
echo - EarningsTable-Restart (Daily at 2:00 AM)  
echo - EarningsTable-UpdateData (Every hour)
echo - EarningsTable-HealthCheck (Every 30 minutes)
echo.
echo 🔧 To manage tasks, open Task Scheduler and search for "EarningsTable"
echo.
pause
