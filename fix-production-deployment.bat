@echo off
REM Fix Production Deployment Script for Windows
REM This script will help diagnose and provide commands for fixing the ENOENT error

echo ===========================================
echo    EarningsTable Production Fix Script
echo ===========================================
echo Date: %date% %time%
echo.

echo [INFO] This script provides commands to fix your production deployment.
echo [INFO] Copy and run these commands on your production server.
echo.

echo ===========================================
echo    OPTION 1: Docker Deployment Fix
echo ===========================================
echo.
echo If you're using Docker deployment, run these commands on your server:
echo.
echo # Check if Docker containers are running
echo docker ps --filter "name=earnings"
echo.
echo # Stop and rebuild containers
echo docker-compose down
echo docker-compose build --no-cache
echo docker-compose up -d
echo.
echo # Check logs
echo docker logs earnings-app --tail=30
echo.
echo # Test the application
echo curl http://localhost:3000/api/earnings
echo.

echo ===========================================
echo    OPTION 2: Direct Deployment Fix
echo ===========================================
echo.
echo If you deployed directly to /var/www/earnings-table, run these commands:
echo.
echo # Navigate to the application directory
echo cd /var/www/earnings-table
echo.
echo # Install dependencies
echo npm ci --production
echo.
echo # Generate Prisma client
echo npx prisma generate
echo.
echo # Build the application
echo npm run build
echo.
echo # Restart services if using systemd
echo sudo systemctl restart earnings-table
echo sudo systemctl restart earnings-cron
echo.
echo # Check service status
echo sudo systemctl status earnings-table
echo.

echo ===========================================
echo    OPTION 3: Fresh Deployment
echo ===========================================
echo.
echo If you need to deploy fresh, use one of these scripts:
echo.
echo # For Docker deployment
echo bash deployment/deploy-production.sh
echo.
echo # For direct deployment
echo bash deploy.sh
echo.

echo ===========================================
echo    DIAGNOSTIC COMMANDS
echo ===========================================
echo.
echo Run these commands to diagnose the issue:
echo.
echo # Check if the application is running
echo ps aux ^| grep node
echo.
echo # Check which ports are in use
echo netstat -tlnp ^| grep :3000
echo.
echo # Check Docker containers (if using Docker)
echo docker ps -a
echo.
echo # Check systemd services (if using direct deployment)
echo sudo systemctl status earnings-table
echo sudo systemctl status earnings-cron
echo.
echo # Check application logs
echo journalctl -u earnings-table --no-pager --lines=50
echo.
echo # Test API endpoints
echo curl http://localhost:3000/api/earnings
echo curl http://localhost:3000/api/earnings/stats
echo.

echo ===========================================
echo    QUICK SOLUTION
echo ===========================================
echo.
echo The error you're seeing means the Next.js build files are missing.
echo This usually happens when:
echo 1. The application wasn't built properly
echo 2. The build files were deleted
echo 3. The application is looking in the wrong directory
echo.
echo QUICKEST FIX: Run these commands on your server:
echo.
echo cd /path/to/your/application
echo npm run build
echo.
echo If using Docker:
echo docker-compose restart app
echo.
echo If using systemd:
echo sudo systemctl restart earnings-table
echo.

pause
