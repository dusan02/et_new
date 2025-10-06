# PowerShell script to deploy to production server
# Usage: .\deploy-to-production.ps1

Write-Host "🚀 DEPLOYMENT TO PRODUCTION" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# Server details - UPRAV TOTO!
$SERVER_USER = "root"
$SERVER_HOST = "89.185.250.213"  # alebo tvoja doména
$PROJECT_PATH = "/var/www/earnings-table"

Write-Host "📡 Connecting to: $SERVER_USER@$SERVER_HOST" -ForegroundColor Yellow
Write-Host ""

# SSH commands to execute on server
$SSH_COMMANDS = @"
cd $PROJECT_PATH
echo '📦 Pulling latest changes...'
git pull origin main
echo ''
echo '🔐 Making scripts executable...'
chmod +x *.sh
echo ''
echo '🧹 Step 1: Cleanup CRLF (one-time)...'
./cleanup-crlf.sh
echo ''
echo '🚑 Step 2: Restoring data...'
./immediate-data-restore.sh
echo ''
echo '🧪 Step 3: Validation...'
./post-hotfix-check.sh
"@

Write-Host "Executing deployment commands on server..." -ForegroundColor Green
Write-Host ""

# Execute via SSH
ssh "$SERVER_USER@$SERVER_HOST" $SSH_COMMANDS

Write-Host ""
Write-Host "✅ Deployment completed!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Check website: https://www.earningstable.com" -ForegroundColor Cyan

