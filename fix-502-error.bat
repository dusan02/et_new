@echo off
echo Fixing 502 Bad Gateway Error...
echo.

echo Step 1: Setting environment variables
set POSTGRES_PASSWORD=earnings_secure_password_2024
set POLYGON_API_KEY=Vi_pMLcusE8RA_SUvkPAmiyziVzlmOoX
set FINNHUB_API_KEY=d28f1dhr01qjsuf342ogd28f1dhr01qjsuf342p0

echo Step 2: Waiting for Docker Desktop to start...
timeout /t 10 /nobreak > nul

echo Step 3: Checking Docker status
docker info > nul 2>&1
if %errorlevel% neq 0 (
    echo Docker Desktop is not running. Please start Docker Desktop manually.
    echo You can find it in your Start Menu or system tray.
    pause
    exit /b 1
)

echo Step 4: Stopping any existing containers
docker-compose -f docker-compose.prod.yml down

echo Step 5: Building and starting services
docker-compose -f docker-compose.prod.yml up -d --build

echo Step 6: Checking service status
docker-compose -f docker-compose.prod.yml ps

echo.
echo Services should now be running. Check http://localhost
echo If you still get 502 errors, wait a few minutes for all services to fully start.
echo.
pause
