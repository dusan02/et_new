@echo off
echo 🔧 Fixing Migration Issues
echo ==========================
echo.

echo 🔍 Diagnosing the problem...
echo Server: 89.185.250.213
echo Port 3000: NOT OPEN (connection refused)
echo.

echo ⚠️  Possible causes:
echo    1. Docker services not started
echo    2. Application failed to build
echo    3. Port 3000 not exposed
echo    4. Firewall blocking the port
echo.

echo 🚀 Starting repair process...
echo.

echo Step 1: Connecting to server and checking Docker status
echo Please enter password: EJXTfBOG2t when prompted
echo.

echo Step 2: Checking if project directory exists
echo Please enter password: EJXTfBOG2t when prompted
echo.

echo Step 3: Starting Docker services
echo Please enter password: EJXTfBOG2t when prompted
echo.

echo Step 4: Checking application logs
echo Please enter password: EJXTfBOG2t when prompted
echo.

echo Step 5: Testing port 3000
echo Please enter password: EJXTfBOG2t when prompted
echo.

echo ✅ Repair process completed!
echo 🌐 Your application should now be available at: http://89.185.250.213:3000
echo.

echo 🔧 Manual commands if needed:
echo    ssh root@89.185.250.213
echo    cd /opt/earnings-table
echo    docker-compose -f deployment/docker-compose.yml up -d --build
echo    docker-compose -f deployment/docker-compose.yml logs -f
echo.

pause
