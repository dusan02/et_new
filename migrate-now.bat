@echo off
echo 🚀 Direct Migration to VPS (bardus)
echo ==================================
echo 📅 Date: %date% %time%
echo 🌐 Target: 89.185.250.213
echo.

echo ⚠️  This will clean up the server and deploy your project
echo    Server: 89.185.250.213
echo    User: root
echo    Password: EJXTfBOG2t
echo.
set /p confirm="Continue? (yes/no): "

if not "%confirm%"=="yes" (
    echo ❌ Migration cancelled.
    pause
    exit /b 1
)

echo.
echo 📋 Step 1: Testing connection...
echo Please enter password: EJXTfBOG2t when prompted

echo.
echo 🧹 Step 2: Cleaning up server...
echo Please enter password: EJXTfBOG2t when prompted

echo.
echo 📋 Step 3: Copying project files...
echo Please enter password: EJXTfBOG2t when prompted

echo.
echo ⚙️ Step 4: Setting up production environment...
echo Please enter password: EJXTfBOG2t when prompted

echo.
echo 🔨 Step 5: Building and starting services...
echo Please enter password: EJXTfBOG2t when prompted

echo.
echo ✅ Migration completed!
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
echo    docker-compose -f deployment/docker-compose.yml restart
echo.
pause
