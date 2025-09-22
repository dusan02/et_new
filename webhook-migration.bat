@echo off
echo 🚀 Git Webhook Migration for EarningsTable
echo ================================================
echo.

echo 📋 Step 1: Upload webhook deployment script
echo Command: scp webhook-deploy.sh root@89.185.250.213:/usr/local/bin/
echo.
echo 📋 Step 2: Upload webhook configuration
echo Command: scp webhook.conf root@89.185.250.213:/etc/webhook.conf
echo.
echo 📋 Step 3: Set executable permissions
echo Command: ssh root@89.185.250.213 "chmod +x /usr/local/bin/webhook-deploy.sh"
echo.
echo 📋 Step 4: Install webhook service
echo Command: ssh root@89.185.250.213 "apt update && apt install -y webhook"
echo.
echo 📋 Step 5: Start webhook service
echo Command: ssh root@89.185.250.213 "nohup webhook -hooks /etc/webhook.conf -verbose -port 9000 > /var/log/webhook.log 2>&1 &"
echo.
echo 📋 Step 6: Configure GitHub webhook
echo   Go to: https://github.com/dusan02/et_new/settings/hooks
echo   Add webhook:
echo     - Payload URL: http://89.185.250.213:9000/hooks/deploy-earnings-table
echo     - Content type: application/json
echo     - Secret: earnings-webhook-secret-2024
echo     - Events: Just the push event
echo.
echo 📋 Step 7: Test deployment
echo Command: curl -X POST http://89.185.250.213:9000/hooks/deploy-earnings-table
echo.
echo ⚠️  You will need to enter the server password for each SSH/SCP command.
echo.
pause

echo.
echo 🔄 Starting migration...
echo.

echo 📤 Uploading webhook script...
scp webhook-deploy.sh root@89.185.250.213:/usr/local/bin/
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to upload webhook script
    pause
    exit /b 1
)

echo 📤 Uploading webhook configuration...
scp webhook.conf root@89.185.250.213:/etc/webhook.conf
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to upload webhook configuration
    pause
    exit /b 1
)

echo 🔧 Setting permissions...
ssh root@89.185.250.213 "chmod +x /usr/local/bin/webhook-deploy.sh"
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to set permissions
    pause
    exit /b 1
)

echo 📦 Installing webhook service...
ssh root@89.185.250.213 "apt update && apt install -y webhook"
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install webhook service
    pause
    exit /b 1
)

echo 🚀 Starting webhook service...
ssh root@89.185.250.213 "nohup webhook -hooks /etc/webhook.conf -verbose -port 9000 > /var/log/webhook.log 2>&1 &"
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to start webhook service
    pause
    exit /b 1
)

echo.
echo ✅ Webhook migration completed successfully!
echo.
echo 🔗 Next steps:
echo   1. Go to GitHub: https://github.com/dusan02/et_new/settings/hooks
echo   2. Add webhook with URL: http://89.185.250.213:9000/hooks/deploy-earnings-table
echo   3. Set secret: earnings-webhook-secret-2024
echo   4. Test by pushing to GitHub
echo.
echo 🌐 Your webhook endpoint: http://89.185.250.213:9000/hooks/deploy-earnings-table
echo.
pause

