@echo off
echo 🚀 Git Webhook Migration - Manual Steps
echo ========================================
echo.
echo 📋 Copy and run these commands one by one:
echo.
echo 1️⃣ Upload webhook script:
echo scp webhook-deploy.sh root@89.185.250.213:/usr/local/bin/
echo.
echo 2️⃣ Upload webhook config:
echo scp webhook.conf root@89.185.250.213:/etc/webhook.conf
echo.
echo 3️⃣ Set permissions:
echo ssh root@89.185.250.213 "chmod +x /usr/local/bin/webhook-deploy.sh"
echo.
echo 4️⃣ Install webhook service:
echo ssh root@89.185.250.213 "apt update && apt install -y webhook"
echo.
echo 5️⃣ Start webhook service:
echo ssh root@89.185.250.213 "nohup webhook -hooks /etc/webhook.conf -verbose -port 9000 > /var/log/webhook.log 2>&1 &"
echo.
echo 6️⃣ Check if webhook is running:
echo ssh root@89.185.250.213 "ps aux | grep webhook"
echo.
echo 7️⃣ Test webhook endpoint:
echo curl -X POST http://89.185.250.213:9000/hooks/deploy-earnings-table
echo.
echo 🔗 Then configure GitHub webhook at:
echo https://github.com/dusan02/et_new/settings/hooks
echo.
echo Webhook URL: http://89.185.250.213:9000/hooks/deploy-earnings-table
echo Secret: earnings-webhook-secret-2024
echo.
pause

