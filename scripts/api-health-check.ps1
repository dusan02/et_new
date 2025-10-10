# API Health Check Script for Windows
# Quick monitoring for earnings API data quality

Write-Host "🔍 Running API health check..." -ForegroundColor Cyan

try {
    # Get API response
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/earnings" -Method Get
    
    $total = $response.data.Count
    $stale = $response.meta.note
    $insaneRevenue = 0
    $missingPrice = 0
    $withPriceData = 0
    $extremeChanges = 0
    $bigIntIssues = 0
    
    # Analyze data
    foreach ($item in $response.data) {
        # Check for insane revenue values
        if (($item.revenueActual -and $item.revenueActual -gt 1e12) -or 
            ($item.revenueEstimate -and $item.revenueEstimate -gt 1e12)) {
            $insaneRevenue++
        }
        
        # Check for price data availability
        if ($item.currentPrice -ne $null -and $item.previousClose -ne $null) {
            $withPriceData++
        }
        
        # Check for missing price data
        if ($item.currentPrice -ne $null -and $item.previousClose -eq $null) {
            $missingPrice++
        }
        
        # Check for extreme price changes
        if ($item.priceChangePercent -and [Math]::Abs($item.priceChangePercent) -gt 50) {
            $extremeChanges++
        }
        
        # Check for BigInt issues
        if ($item.revenueActual -is [System.Numerics.BigInteger] -or 
            $item.revenueEstimate -is [System.Numerics.BigInteger]) {
            $bigIntIssues++
        }
    }
    
    Write-Host "📊 Health Check Results:" -ForegroundColor Green
    Write-Host "  Total records: $total"
    Write-Host "  Stale data: $stale"
    Write-Host "  With price data: $withPriceData/$total"
    Write-Host "  Insane revenue values: $insaneRevenue"
    Write-Host "  Missing price data: $missingPrice"
    Write-Host "  Extreme price changes: $extremeChanges"
    Write-Host "  BigInt serialization issues: $bigIntIssues"
    
    # Determine health status
    $issues = 0
    if ($insaneRevenue -gt 0) {
        Write-Host "❌ Found $insaneRevenue records with insane revenue values" -ForegroundColor Red
        $issues++
    }
    
    if ($bigIntIssues -gt 0) {
        Write-Host "❌ Found $bigIntIssues records with BigInt serialization issues" -ForegroundColor Red
        $issues++
    }
    
    if ($extremeChanges -gt 0) {
        Write-Host "⚠️  Found $extremeChanges records with extreme price changes" -ForegroundColor Yellow
        $issues++
    }
    
    if ($missingPrice -gt 0) {
        Write-Host "⚠️  Found $missingPrice records with missing price data" -ForegroundColor Yellow
        $issues++
    }
    
    # Final status
    if ($issues -eq 0) {
        Write-Host "🎉 API is healthy! All checks passed." -ForegroundColor Green
        exit 0
    }
    else {
        Write-Host "⚠️  Found $issues issues. API needs attention." -ForegroundColor Yellow
        exit 1
    }
    
}
catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
