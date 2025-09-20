@echo off
echo 🗑️ Cleaning server for Git deployment
echo =====================================
echo.

echo ⚠️  This will completely clean the server and prepare it for Git deployment
echo    Server: 89.185.250.213
echo    User: root
echo    Password: EJXTfBOG2t
echo.

set /p confirm="Continue with server cleanup? (yes/no): "

if not "%confirm%"=="yes" (
    echo ❌ Cleanup cancelled.
    pause
    exit /b 1
)

echo.
echo 🧹 Starting server cleanup...
echo.

echo Step 1: Stopping all Docker services
ssh root@89.185.250.213 "cd /opt/earnings-table && docker-compose -f deployment/docker-compose.yml down || true"

echo.
echo Step 2: Removing old project directory
ssh root@89.185.250.213 "rm -rf /opt/earnings-table || true"

echo.
echo Step 3: Cleaning Docker system
ssh root@89.185.250.213 "docker system prune -f || true"

echo.
echo Step 4: Creating fresh project directory
ssh root@89.185.250.213 "mkdir -p /opt/earnings-table"

echo.
echo ✅ Server cleanup completed!
echo 📁 Fresh directory created: /opt/earnings-table
echo.

echo 🚀 Ready for Git deployment!
echo Next: Clone repository from GitHub
echo.

pause

