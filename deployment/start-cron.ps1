Write-Host "🚀 Starting Earnings Cron Worker..." -ForegroundColor Green
Write-Host ""

# Change to queue directory
Set-Location "src\queue"
Write-Host "📁 Current directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

# Check if worker-new.js exists
if (Test-Path "worker-new.js") {
    Write-Host "✅ Found worker-new.js" -ForegroundColor Green
    Write-Host "🔄 Starting worker..." -ForegroundColor Cyan
    Write-Host ""
    
    # Start the worker
    node worker-new.js
}
else {
    Write-Host "❌ worker-new.js not found!" -ForegroundColor Red
    Write-Host "📋 Available files:" -ForegroundColor Yellow
    Get-ChildItem -Name "*.js"
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
