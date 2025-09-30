@echo off
REM Production Deployment Script for EarningsTable (Windows)
REM Usage: deploy-production.bat [server_ip]

setlocal enabledelayedexpansion

REM Configuration
set SERVER_IP=%1
if "%SERVER_IP%"=="" set SERVER_IP=89.185.250.213
set APP_NAME=earnings-table
set DOCKER_IMAGE=earnings-table:latest
set CONTAINER_NAME=earnings-app
set CRON_CONTAINER_NAME=earnings-cron

echo 🚀 Starting production deployment to %SERVER_IP%

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from the project root.
    exit /b 1
)

REM Build Docker image
echo 📦 Building Docker image...
docker build -f Dockerfile.production -t %DOCKER_IMAGE% .

if errorlevel 1 (
    echo ❌ Docker build failed
    exit /b 1
)

echo ✅ Docker image built successfully

REM Save image to tar file
echo 💾 Saving Docker image...
docker save %DOCKER_IMAGE% | gzip > %APP_NAME%-image.tar.gz

REM Copy files to server
echo 📤 Copying files to server...
scp %APP_NAME%-image.tar.gz root@%SERVER_IP%:/tmp/
scp docker-compose.production.yml root@%SERVER_IP%:/tmp/
scp production.env root@%SERVER_IP%:/tmp/.env.production

REM Deploy on server
echo 🚀 Deploying on server...
ssh root@%SERVER_IP% "set -e && echo '📥 Loading Docker image...' && docker load < /tmp/%APP_NAME%-image.tar.gz && echo '🛑 Stopping existing containers...' && docker stop %CONTAINER_NAME% %CRON_CONTAINER_NAME% 2>/dev/null || true && docker rm %CONTAINER_NAME% %CRON_CONTAINER_NAME% 2>/dev/null || true && echo '📁 Setting up directories...' && mkdir -p /opt/%APP_NAME% && cd /opt/%APP_NAME% && echo '📋 Copying configuration files...' && cp /tmp/docker-compose.production.yml ./docker-compose.yml && cp /tmp/.env.production ./.env.production && echo '🔧 Setting environment variables...' && export DATABASE_URL='postgresql://earnings_user:earnings_password@localhost:5432/earnings_table' && export FINNHUB_API_KEY='d28f1dhr01qjsuf342ogd28f1dhr01qjsuf342p0' && export POLYGON_API_KEY='Vi_pMLcusE8RA_SUvkPAmiyziVzlmOoX' && echo '🚀 Starting containers...' && docker-compose up -d && echo '⏳ Waiting for application to start...' && sleep 10 && echo '🔍 Checking application health...' && curl -f http://localhost:3000/api/monitoring/health || echo 'Health check failed, but continuing...' && echo '🧹 Cleaning up...' && rm -f /tmp/%APP_NAME%-image.tar.gz && rm -f /tmp/docker-compose.production.yml && rm -f /tmp/.env.production && echo '✅ Deployment completed!' && echo '🌐 Application should be available at:' && echo '   - http://%SERVER_IP%:3000' && echo '   - https://earningstable.com'"

if errorlevel 1 (
    echo ❌ Deployment failed
    exit /b 1
) else (
    echo 🎉 Deployment completed successfully!
    echo 🌐 Application URLs:
    echo    - http://%SERVER_IP%:3000
    echo    - https://earningstable.com
)

REM Clean up local files
del %APP_NAME%-image.tar.gz

echo ✨ All done!