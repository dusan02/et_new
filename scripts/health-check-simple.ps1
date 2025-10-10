# Simple API Health Check for Windows
Write-Host "🔍 Running API health check..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/earnings" -Method Get
    
    $total = $response.data.Count
    $insaneRevenue = 0
    $withPriceData = 0
    
    foreach ($item in $response.data) {
        if (($item.revenueActual -and $item.revenueActual -gt 1e12) -or 
            ($item.revenueEstimate -and $item.revenueEstimate -gt 1e12)) {
            $insaneRevenue++
        }
        
        if ($item.currentPrice -ne $null -and $item.previousClose -ne $null) {
            $withPriceData++
        }
    }
    
    Write-Host "📊 Health Check Results:" -ForegroundColor Green
    Write-Host "  Total records: $total"
    Write-Host "  With price data: $withPriceData/$total"
    Write-Host "  Insane revenue values: $insaneRevenue"
    
    if ($insaneRevenue -eq 0) {
        Write-Host "🎉 API is healthy! All checks passed." -ForegroundColor Green
    } else {
        Write-Host "❌ Found $insaneRevenue records with insane revenue values" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}
