@echo off
echo 🔍 Quick Diagnosis of Migration Issues
echo ======================================
echo.

echo 📊 Current Status:
echo    Server: 89.185.250.213
echo    Port 3000: NOT ACCESSIBLE
echo    Error: ERR_CONNECTION_REFUSED
echo.

echo 🔧 Quick Fix Commands:
echo.
echo 1. Connect to server:
echo    ssh root@89.185.250.213
echo    Password: EJXTfBOG2t
echo.

echo 2. Check Docker status:
echo    cd /opt/earnings-table
echo    docker-compose -f deployment/docker-compose.yml ps
echo.

echo 3. Restart services:
echo    docker-compose -f deployment/docker-compose.yml down
echo    docker-compose -f deployment/docker-compose.yml up -d --build
echo.

echo 4. Check logs:
echo    docker-compose -f deployment/docker-compose.yml logs -f
echo.

echo 5. Test port:
echo    curl http://localhost:3000
echo.

echo ⚠️  Most likely cause: Docker services not started
echo 💡 Solution: Restart Docker services with --build flag
echo.

echo 🚀 Ready to fix? Run these commands on the server:
echo.
echo    ssh root@89.185.250.213
echo    cd /opt/earnings-table
echo    docker-compose -f deployment/docker-compose.yml down
echo    docker-compose -f deployment/docker-compose.yml up -d --build
echo.

pause
