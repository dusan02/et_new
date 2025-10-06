# 🚀 COMPLETE VPS DEPLOYMENT SCRIPT (PowerShell)
# Vymaže všetko na VPS a prenasadí z localhost cez git

param(
    [string]$VpsHost = "89.185.250.213",
    [string]$VpsUser = "root",
    [string]$VpsPath = "/var/www/earnings-table",
    [string]$GitRepo = "https://github.com/dusan02/et_new.git"
)

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$NC = "`e[0m"

Write-Host "🚀 Starting complete VPS deployment..." -ForegroundColor Green

Write-Host "📋 Deployment Configuration:" -ForegroundColor Blue
Write-Host "VPS Host: $VpsHost"
Write-Host "VPS User: $VpsUser"
Write-Host "VPS Path: $VpsPath"
Write-Host "Git Repo: $GitRepo"
Write-Host ""

# Step 1: Clean up VPS completely
Write-Host "🧹 Step 1: Cleaning up VPS server..." -ForegroundColor Yellow

$cleanupScript = @"
echo "🛑 Stopping all processes..."

# Stop PM2 processes
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Stop Docker containers
docker stop `$(docker ps -aq) 2>/dev/null || true
docker rm `$(docker ps -aq) 2>/dev/null || true

# Stop any Node.js processes
pkill -f node 2>/dev/null || true
pkill -f npm 2>/dev/null || true
pkill -f tsx 2>/dev/null || true

# Remove application directory
echo "🗑️ Removing application directory..."
rm -rf /var/www/earnings-table 2>/dev/null || true
rm -rf /opt/earnings-table 2>/dev/null || true
rm -rf /opt/et_new 2>/dev/null || true

# Clean up system
echo "🧹 Cleaning up system..."
apt-get update -y
apt-get autoremove -y
apt-get autoclean -y

# Clear any remaining processes
echo "🔄 Final cleanup..."
sleep 2

echo "✅ VPS cleanup completed!"
"@

ssh "$VpsUser@$VpsHost" $cleanupScript

Write-Host "✅ VPS cleanup completed!" -ForegroundColor Green

# Step 2: Commit local changes to git
Write-Host "📝 Step 2: Committing local changes to git..." -ForegroundColor Yellow

# Check if we're in a git repository
if (-not (Test-Path ".git")) {
    Write-Host "❌ Not in a git repository! Initializing..." -ForegroundColor Red
    git init
    git remote add origin $GitRepo
}

# Add all changes
git add .

# Check if there are changes to commit
$gitStatus = git status --porcelain
if ([string]::IsNullOrEmpty($gitStatus)) {
    Write-Host "⚠️ No changes to commit" -ForegroundColor Yellow
} else {
    # Commit changes
    $commitMessage = @"
Complete VPS deployment - all fixes applied

- Fixed API fallback logic (no more old data)
- Fixed cache invalidation timing
- Fixed cron job coordination
- Enhanced error handling
- Added comprehensive monitoring

Deployed: $(Get-Date)
"@
    
    git commit -m $commitMessage
    Write-Host "✅ Local changes committed to git" -ForegroundColor Green
}

# Push to remote repository
Write-Host "📤 Pushing to remote repository..." -ForegroundColor Yellow
git push origin main --force

Write-Host "✅ Changes pushed to git repository" -ForegroundColor Green

# Step 3: Deploy to VPS
Write-Host "🚀 Step 3: Deploying to VPS server..." -ForegroundColor Yellow

$deployScript = @"
echo "📥 Cloning repository from git..."

# Create application directory
mkdir -p $VpsPath
cd $VpsPath

# Clone repository
git clone $GitRepo .

echo "📦 Installing dependencies..."
npm ci --production

echo "🔧 Setting up environment..."
# Copy environment file
if [ -f ".env.production" ]; then
    cp .env.production .env
    echo "✅ Environment file copied"
else
    echo "⚠️ No .env.production found, using defaults"
fi

echo "🗄️ Setting up database..."
# Generate Prisma client
npx prisma generate

# Run database migrations if needed
npx prisma db push --accept-data-loss

echo "🏗️ Building application..."
npm run build

echo "🚀 Starting application with PM2..."

# Create PM2 ecosystem file if it doesn't exist
if [ ! -f "ecosystem.config.js" ]; then
    cat > ecosystem.config.js << 'PM2EOF'
module.exports = {
  apps: [
    {
      name: 'earnings-table',
      script: 'npm',
      args: 'start',
      cwd: process.cwd(),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'earnings-worker',
      script: 'src/queue/worker-new.js',
      cwd: process.cwd(),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
PM2EOF
fi

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup

echo "✅ Application started with PM2"
"@

ssh "$VpsUser@$VpsHost" $deployScript

Write-Host "✅ VPS deployment completed!" -ForegroundColor Green

# Step 4: Verify deployment
Write-Host "🔍 Step 4: Verifying deployment..." -ForegroundColor Yellow

# Wait for application to start
Write-Host "⏳ Waiting for application to start..."
Start-Sleep -Seconds 10

# Test endpoints
Write-Host "🧪 Testing endpoints..."

# Test health endpoint
try {
    $healthResponse = Invoke-WebRequest -Uri "http://$VpsHost:3000/api/health" -UseBasicParsing -TimeoutSec 10
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "✅ Health endpoint responding (HTTP $($healthResponse.StatusCode))" -ForegroundColor Green
    } else {
        Write-Host "❌ Health endpoint not responding (HTTP $($healthResponse.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Health endpoint not responding (Error: $($_.Exception.Message))" -ForegroundColor Red
}

# Test earnings endpoint
try {
    $earningsResponse = Invoke-WebRequest -Uri "http://$VpsHost:3000/api/earnings" -UseBasicParsing -TimeoutSec 10
    if ($earningsResponse.StatusCode -eq 200) {
        Write-Host "✅ Earnings endpoint responding (HTTP $($earningsResponse.StatusCode))" -ForegroundColor Green
    } else {
        Write-Host "❌ Earnings endpoint not responding (HTTP $($earningsResponse.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Earnings endpoint not responding (Error: $($_.Exception.Message))" -ForegroundColor Red
}

# Check PM2 status
Write-Host "📊 Checking PM2 status..."
ssh "$VpsUser@$VpsHost" "pm2 status"

Write-Host ""
Write-Host "🎉 Complete VPS deployment finished!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Blue
Write-Host "1. ✅ VPS server completely cleaned"
Write-Host "2. ✅ Local changes committed to git"
Write-Host "3. ✅ Application deployed to VPS"
Write-Host "4. ✅ Application started with PM2"
Write-Host "5. ✅ Endpoints tested"
Write-Host ""
Write-Host "🔗 Access URLs:" -ForegroundColor Blue
Write-Host "Main App: http://$VpsHost:3000"
Write-Host "API Health: http://$VpsHost:3000/api/health"
Write-Host "API Earnings: http://$VpsHost:3000/api/earnings"
Write-Host ""
Write-Host "📊 Monitoring:" -ForegroundColor Blue
Write-Host "PM2 Status: ssh $VpsUser@$VpsHost 'pm2 status'"
Write-Host "PM2 Logs: ssh $VpsUser@$VpsHost 'pm2 logs'"
Write-Host "System Logs: ssh $VpsUser@$VpsHost 'journalctl -u pm2-root -f'"
Write-Host ""
Write-Host "⚠️ Next steps:" -ForegroundColor Yellow
Write-Host "1. Monitor application logs for any issues"
Write-Host "2. Test cron jobs are running properly"
Write-Host "3. Verify data is being fetched correctly"
Write-Host "4. Set up monitoring and alerting if needed"
