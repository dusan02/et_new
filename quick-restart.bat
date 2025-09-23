@echo off
echo 🔄 Rýchly reštart produkčného servera pre earningstable.com
echo ==================================================
echo.

echo Krok 1: Pripojenie na server...
echo Spustite tento príkaz na serveri:
echo.
echo ssh root@89.185.250.213
echo.
echo Krok 2: Upload a spustenie reštart scriptu...
echo.
echo scp restart-production-server.sh root@89.185.250.213:~/
echo ssh root@89.185.250.213 "chmod +x restart-production-server.sh && ./restart-production-server.sh"
echo.
echo Alebo manuálne:
echo 1. SSH na server: ssh root@89.185.250.213
echo 2. Zastaviť procesy: pkill -f "next" && pkill -f "node.*earnings"
echo 3. Reštartovať Nginx: sudo systemctl restart nginx
echo 4. Nájsť aplikáciu: cd /var/www/earnings-table
echo 5. Spustiť aplikáciu: NODE_ENV=production nohup npm start > app.log 2>&1 &
echo 6. Testovať: curl http://localhost:3000
echo.
echo Po reštarte by malo fungovať:
echo - http://earningstable.com
echo - https://earningstable.com
echo.
pause
