@echo off
echo 🚀 Starting Production Deployment...
echo ==================================
echo 📅 Date: %date% %time%
echo 🌐 Target: VPS (bardus) - 89.185.250.213
echo.

REM Check if WSL is available
wsl --version >nul 2>&1
if %errorlevel% equ 0 (
    echo 📦 Using WSL for deployment...
    wsl bash scripts/deploy-to-server.sh
) else (
    echo ❌ WSL not available. Please install WSL or run the script manually.
    echo.
    echo Manual steps:
    echo 1. Install WSL: wsl --install
    echo 2. Or use PuTTY/SSH client to connect to server
    echo 3. Run the deployment commands manually
    pause
    exit /b 1
)

echo.
echo ✅ Deployment completed!
pause
