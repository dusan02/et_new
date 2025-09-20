@echo off
echo 🚀 Ultimate Migration to VPS (bardus)
echo =====================================
echo 📅 Date: %date% %time%
echo 🌐 Target: 89.185.250.213
echo.

echo ⚠️  This will perform a complete migration with all enhancements:
echo    - Automatic backup before migration
echo    - Prerequisites checking
echo    - Smart deployment with retry logic
echo    - Monitoring setup
echo    - Post-migration testing
echo    - Health checks
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
echo 📋 Step 1: Creating backup before migration...
echo Please enter password: EJXTfBOG2t when prompted

echo.
echo 📋 Step 2: Checking prerequisites...
echo Please enter password: EJXTfBOG2t when prompted

echo.
echo 📋 Step 3: Cleaning server...
echo Please enter password: EJXTfBOG2t when prompted

echo.
echo 📋 Step 4: Deploying application...
echo Please enter password: EJXTfBOG2t when prompted

echo.
echo 📋 Step 5: Setting up monitoring...
echo Please enter password: EJXTfBOG2t when prompted

echo.
echo 📋 Step 6: Running post-migration tests...
echo Please enter password: EJXTfBOG2t when prompted

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
