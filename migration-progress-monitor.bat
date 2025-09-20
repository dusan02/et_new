@echo off
setlocal enabledelayedexpansion

echo 🔍 Migration Progress Monitor
echo ============================
echo.

:monitor_loop
echo Checking migration progress...

REM Check Step 1: Backup
echo 🔍 Checking: Creating backup
ssh root@89.185.250.213 "test -d /opt/backups/earnings-table" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Step 1: Backup directory exists
    set step1=1
) else (
    echo ⏳ Step 1: Backup not yet created
    set step1=0
)

REM Check Step 2: Docker
echo 🔍 Checking: Checking prerequisites
ssh root@89.185.250.213 "docker --version" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Step 2: Docker is installed
    set step2=1
) else (
    echo ⏳ Step 2: Docker not yet installed
    set step2=0
)

REM Check Step 3: Clean server
echo 🔍 Checking: Cleaning server
ssh root@89.185.250.213 "test ! -d /opt/earnings-table" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Step 3: Server is clean
    set step3=1
) else (
    echo ⏳ Step 3: Server not yet cleaned
    set step3=0
)

REM Check Step 4: Deploy application
echo 🔍 Checking: Deploying application
ssh root@89.185.250.213 "test -f /opt/earnings-table/package.json" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Step 4: Application is deployed
    set step4=1
) else (
    echo ⏳ Step 4: Application not yet deployed
    set step4=0
)

REM Check Step 5: Monitoring
echo 🔍 Checking: Setting up monitoring
ssh root@89.185.250.213 "test -f /opt/earnings-table/monitoring/monitor.sh" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Step 5: Monitoring is setup
    set step5=1
) else (
    echo ⏳ Step 5: Monitoring not yet setup
    set step5=0
)

REM Check Step 6: Tests
echo 🔍 Checking: Running tests
ssh root@89.185.250.213 "curl -s -o /dev/null -w '%%{http_code}' http://localhost:3000/api/earnings" | findstr "200" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Step 6: Tests are passing
    set step6=1
) else (
    echo ⏳ Step 6: Tests not yet completed
    set step6=0
)

REM Check Step 7: Complete
echo 🔍 Checking: Finalizing migration
curl -s -o /dev/null -w "%%{http_code}" http://89.185.250.213:3000 | findstr "200" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Step 7: Migration is complete
    set step7=1
) else (
    echo ⏳ Step 7: Migration not yet complete
    set step7=0
)

REM Calculate progress
set /a completed=!step1!+!step2!+!step3!+!step4!+!step5!+!step6!+!step7!
set /a percentage=!completed!*100/7

echo.
echo Progress: [!completed!/7] - !percentage!%%
echo.

if !completed! equ 7 (
    echo 🎉 Migration completed successfully!
    echo Progress: [================================================] 100%% - Complete
    echo.
    echo 📊 Final Status:
    echo    🌐 Application: http://89.185.250.213:3000
    echo    📊 API: http://89.185.250.213:3000/api/earnings
    echo    📈 Stats: http://89.185.250.213:3000/api/earnings/stats
    goto :end
) else (
    echo ⏳ Waiting for next step to complete...
    timeout /t 30 /nobreak >nul
    goto :monitor_loop
)

:end
pause
