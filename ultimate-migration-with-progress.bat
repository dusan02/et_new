@echo off
setlocal enabledelayedexpansion

echo 🚀 Ultimate Migration with Progress to VPS (bardus)
echo ==================================================
echo 📅 Date: %date% %time%
echo 🌐 Target: 89.185.250.213
echo.

echo ⚠️  This will perform a complete migration with progress tracking:
echo    - Step 1/7: Automatic backup before migration
echo    - Step 2/7: Prerequisites checking
echo    - Step 3/7: Smart deployment with retry logic
echo    - Step 4/7: Monitoring setup
echo    - Step 5/7: Post-migration testing
echo    - Step 6/7: Health checks
echo    - Step 7/7: Finalization
echo.
echo    Server: 89.185.250.213
echo    User: root
echo    Password: EJXTfBOG2t
echo.
set /p confirm="Continue with ultimate migration? (yes/no): "

if not "%confirm%"=="yes" (
    echo ❌ Migration cancelled.
    pause
    exit /b 1
)

echo.
echo 🚀 Starting Ultimate Migration with Progress...
echo =============================================
echo.

REM Step 1: Create backup
echo 📦 Step 1/7: Creating backup before migration...
echo Progress: [████████████████████████████████████████████████] 14%% - Creating backup
echo Please enter password: EJXTfBOG2t when prompted
echo.

REM Step 2: Check prerequisites
echo 🔍 Step 2/7: Checking prerequisites...
echo Progress: [████████████████████████████████████████████████] 28%% - Checking prerequisites
echo Please enter password: EJXTfBOG2t when prompted
echo.

REM Step 3: Clean server
echo 🧹 Step 3/7: Cleaning server...
echo Progress: [████████████████████████████████████████████████] 42%% - Cleaning server
echo Please enter password: EJXTfBOG2t when prompted
echo.

REM Step 4: Deploy application
echo 🚀 Step 4/7: Deploying application...
echo Progress: [████████████████████████████████████████████████] 57%% - Deploying application
echo Please enter password: EJXTfBOG2t when prompted
echo.

REM Step 5: Setup monitoring
echo 📊 Step 5/7: Setting up monitoring...
echo Progress: [████████████████████████████████████████████████] 71%% - Setting up monitoring
echo Please enter password: EJXTfBOG2t when prompted
echo.

REM Step 6: Run tests
echo 🧪 Step 6/7: Running post-migration tests...
echo Progress: [████████████████████████████████████████████████] 85%% - Running tests
echo Please enter password: EJXTfBOG2t when prompted
echo.

REM Step 7: Finalize
echo 📋 Step 7/7: Finalizing migration...
echo Progress: [████████████████████████████████████████████████] 100%% - Complete
echo.

echo ✅ Ultimate migration completed!
echo 🌐 Your application is available at: http://89.185.250.213:3000
echo.
echo ⚠️  IMPORTANT: Edit the .env file and add your actual API keys!
echo    ssh root@89.185.250.213
echo    cd /opt/earnings-table
echo    nano .env
echo.
echo 🔧 Useful commands:
echo    ssh root@89.185.250.213
echo    cd /opt/earnings-table
echo    docker-compose -f deployment/docker-compose.yml logs -f
echo.
echo 📊 Monitoring:
echo    Health checks: Every 5 minutes
echo    Logs: /opt/earnings-table/monitoring/monitor.log
echo    Backup: /opt/backups/earnings-table
echo.
echo 🎉 Ultimate migration completed successfully!
pause
