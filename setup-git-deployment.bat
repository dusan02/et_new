@echo off
echo 🚀 Setting up Git deployment from GitHub
echo =======================================
echo.

echo 📋 Repository: https://github.com/dusan02/et_new
echo 🌐 Server: 89.185.250.213
echo 📁 Directory: /opt/earnings-table
echo.

echo Step 1: Cloning repository from GitHub
ssh root@89.185.250.213 "cd /opt && git clone https://github.com/dusan02/et_new.git earnings-table"

echo.
echo Step 2: Setting up production environment
ssh root@89.185.250.213 "cd /opt/earnings-table && cp prisma/schema.prod.prisma prisma/schema.prisma"

echo.
echo Step 3: Creating environment file
ssh root@89.185.250.213 "cd /opt/earnings-table && cp production.env .env"

echo.
echo Step 4: Installing dependencies
ssh root@89.185.250.213 "cd /opt/earnings-table && npm install"

echo.
echo Step 5: Building application
ssh root@89.185.250.213 "cd /opt/earnings-table && npm run build"

echo.
echo Step 6: Starting Docker services
ssh root@89.185.250.213 "cd /opt/earnings-table && docker-compose -f deployment/docker-compose.yml up -d --build"

echo.
echo Step 7: Testing deployment
timeout /t 30 /nobreak
curl http://89.185.250.213:3000

echo.
echo ✅ Git deployment completed!
echo 🌐 Application: http://89.185.250.213:3000
echo.

echo 🔄 For future updates:
echo    git pull origin main
echo    docker-compose -f deployment/docker-compose.yml up -d --build
echo.

pause

