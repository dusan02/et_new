@echo off
echo 🚀 Complete Migration Process
echo ==================================
echo 📅 Date: %date% %time%
echo 🌐 Target: VPS (bardus) - 89.185.250.213
echo.

echo ⚠️  This script will:
echo    1. Test connection to server
echo    2. Clean up existing content on server
echo    3. Deploy your current project
echo    4. Start all services
echo.
set /p confirm="Are you sure you want to continue? (yes/no): "

if not "%confirm%"=="yes" (
    echo ❌ Migration cancelled.
    pause
    exit /b 1
)

REM Check if WSL is available
wsl --version >nul 2>&1
if %errorlevel% equ 0 (
    echo 📦 Using WSL for migration...
    wsl bash scripts/complete-migration.sh
) else (
    echo ❌ WSL not available. Please install WSL or run the script manually.
    echo.
    echo Manual steps:
    echo 1. Install WSL: wsl --install
    echo 2. Or use PuTTY/SSH client to connect to server
    echo 3. Run the migration commands manually
    pause
    exit /b 1
)

echo.
echo ✅ Migration completed successfully!
echo.
echo 🌐 Your application is now available at:
echo    http://89.185.250.213:3000
echo.
echo 📋 Next steps:
echo    1. Configure your API keys in the .env file
echo    2. Test the application
echo    3. Set up domain name (optional)
echo    4. Configure SSL certificate (optional)
echo.
echo 🔧 Useful commands:
echo    ssh root@89.185.250.213
echo    cd /opt/earnings-table
echo    docker-compose logs -f
echo.
echo 📊 Monitor your application:
echo    curl http://89.185.250.213:3000/api/earnings
pause
