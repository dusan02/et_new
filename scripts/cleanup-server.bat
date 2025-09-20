@echo off
echo 🧹 Starting Server Cleanup...
echo ==================================
echo 📅 Date: %date% %time%
echo 🌐 Target: VPS (bardus) - 89.185.250.213
echo.

echo ⚠️  WARNING: This will clean up ALL existing content on the server!
echo    Server: 89.185.250.213
echo    User: root
echo.
set /p confirm="Are you sure you want to continue? (yes/no): "

if not "%confirm%"=="yes" (
    echo ❌ Cleanup cancelled.
    pause
    exit /b 1
)

echo 🔧 Starting cleanup process...

REM Check if WSL is available
wsl --version >nul 2>&1
if %errorlevel% equ 0 (
    echo 📦 Using WSL for cleanup...
    wsl bash scripts/cleanup-server.sh
) else (
    echo ❌ WSL not available. Please install WSL or run the script manually.
    echo.
    echo Manual steps:
    echo 1. Install WSL: wsl --install
    echo 2. Or use PuTTY/SSH client to connect to server
    echo 3. Run the cleanup commands manually
    pause
    exit /b 1
)

echo.
echo ✅ Cleanup completed!
pause
