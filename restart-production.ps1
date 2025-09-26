# Production Restart Script for earningstable.com
# This will restart the production server with latest fixes

Write-Host "🔄 Restarting production server..." -ForegroundColor Blue
Write-Host "📅 $(Get-Date)" -ForegroundColor Gray

# SSH commands to execute on the server
$commands = @"
cd /var/www/earnings-table
echo "📥 Pulling latest changes..."
git pull origin main
echo "🛑 Stopping existing processes..."
pkill -f "next" 2>/dev/null || true
pkill -f "npm start" 2>/dev/null || true
sleep 3
echo "📦 Installing dependencies..."
npm ci --production
echo "🔧 Generating Prisma client..."
npx prisma generate
echo "🏗️ Building application..."
npm run build
echo "▶️ Starting application..."
NODE_ENV=production nohup npm start > /var/log/earnings-table.log 2>&1 &
echo "⏳ Waiting for startup..."
sleep 10
echo "🏥 Health check..."
curl -f http://localhost:3000 && echo "✅ SUCCESS!" || echo "⚠️ Check logs"
echo "📊 Process status:"
ps aux | grep node | grep -v grep | head -3
echo "🎉 Restart completed!"
"@

Write-Host "Executing commands on production server..." -ForegroundColor Yellow

# Execute SSH command
ssh root@89.185.250.213 $commands

Write-Host "✅ Production restart completed!" -ForegroundColor Green
Write-Host "🌐 Check: https://earningstable.com" -ForegroundColor Cyan

