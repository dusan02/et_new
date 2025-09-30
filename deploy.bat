@echo off
setlocal enabledelayedexpansion

echo 🚀 Starting production deployment...

REM Check if .env.production exists
if not exist ".env.production" (
    echo [ERROR] .env.production file not found!
    echo [WARNING] Creating .env.production from .env.example...
    copy .env.example .env.production
    echo [WARNING] Please edit .env.production with your production values!
    pause
    exit /b 1
)

echo [INFO] Environment file found

REM Stop existing containers
echo [INFO] Stopping existing containers...
docker-compose -f docker-compose.production.yml down

REM Build and start new containers
echo [INFO] Building and starting containers...
docker-compose -f docker-compose.production.yml up --build -d

REM Wait for application to be ready
echo [INFO] Waiting for application to be ready...
timeout /t 30 /nobreak > nul

REM Check if application is running
echo [INFO] Checking application health...
curl -f http://localhost:3000/api/monitoring/health > nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] ✅ Application is running successfully!
    echo [INFO] 🌐 Application URL: http://localhost:3000
) else (
    echo [ERROR] ❌ Application health check failed!
    echo [INFO] Checking logs...
    docker-compose -f docker-compose.production.yml logs app
    pause
    exit /b 1
)

REM Run initial data fetch
echo [INFO] Running initial data fetch...
docker-compose -f docker-compose.production.yml exec app npm run fetch

echo [INFO] 🎉 Deployment completed successfully!
echo [INFO] 📊 Application is running at http://localhost:3000
echo [INFO] 📈 Data will be automatically updated every 30 minutes
pause
