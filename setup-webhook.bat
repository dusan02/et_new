@echo off
echo 🚀 Setting up webhook deployment...

echo.
echo 📋 MANUAL STEPS NEEDED:
echo.
echo 1. Upload webhook-deploy.sh to server:
echo    scp webhook-deploy.sh root@89.185.250.213:/usr/local/bin/
echo.
echo 2. Make it executable:
echo    ssh root@89.185.250.213 "chmod +x /usr/local/bin/webhook-deploy.sh"
echo.
echo 3. Set up GitHub webhook:
echo    - Go to: https://github.com/dusan02/et_new/settings/hooks
echo    - Add webhook: http://89.185.250.213:9000/hooks/deploy
echo    - Content type: application/json
echo    - Secret: earnings-webhook-secret-2024
echo.
echo 4. Install webhook server:
echo    ssh root@89.185.250.213 "apt update && apt install -y webhook"
echo.
echo 5. Start webhook service:
echo    ssh root@89.185.250.213 "webhook -hooks /etc/webhook.conf -verbose"
echo.
echo ✅ After these steps, deployment will be automatic!
echo    Just push to GitHub and server will update automatically.
echo.
pause
