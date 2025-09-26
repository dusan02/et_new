@echo off
echo ========================================
echo   RESTART PRODUCTION SERVER
echo   earningstable.com
echo ========================================
echo.

echo Krok 1: Pripojenie na server a restart...
echo.
echo Spustite tento prikaz v SSH:
echo.
echo ssh root@89.185.250.213
echo.
echo Potom skopirujte a spustte:
echo.
echo cd /var/www/earnings-table
echo git pull origin main
echo pkill -f "next" 2^>/dev/null ^|^| true
echo sleep 3
echo npm ci --production
echo npx prisma generate
echo npm run build
echo NODE_ENV=production nohup npm start ^> /var/log/earnings-table.log 2^>^&1 ^&
echo sleep 10
echo curl -f http://localhost:3000
echo.
echo ========================================
echo Po uspesnom restarte:
echo - Test: https://earningstable.com
echo - API: https://earningstable.com/api/earnings
echo ========================================
echo.
pause

