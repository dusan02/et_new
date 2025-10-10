#!/bin/bash

# API Health Check Script
# Quick monitoring for earnings API data quality

echo "🔍 Running API health check..."

# Check if jq is available, if not use PowerShell alternative
if command -v jq &> /dev/null; then
    USE_JQ=true
elif command -v powershell &> /dev/null; then
    USE_JQ=false
    echo "⚠️  jq not found, using PowerShell alternative"
else
    echo "❌ Neither jq nor PowerShell found. Please install jq or ensure PowerShell is available."
    exit 1
fi

# Run the health check
HEALTH_RESULT=$(curl -s localhost:3000/api/earnings | jq '
{
  total: (.data | length),
  stale: (.meta.note? // "stale-fallback" or null),
  insaneRevenue: ([.data[] | select(.revenueActual != null and .revenueActual > 1e12)] | length),
  missingPrice: ([.data[] | select((.currentPrice != null) and (.previousClose == null))] | length),
  withPriceData: ([.data[] | select(.currentPrice != null and .previousClose != null)] | length),
  extremePriceChanges: ([.data[] | select(.priceChangePercent != null and (.priceChangePercent | length) > 50)] | length),
  bigIntIssues: ([.data[] | select(.revenueActual | type == "bigint" or .revenueEstimate | type == "bigint")] | length)
}')

# Parse results
TOTAL=$(echo "$HEALTH_RESULT" | jq -r '.total')
STALE=$(echo "$HEALTH_RESULT" | jq -r '.stale')
INSANE_REVENUE=$(echo "$HEALTH_RESULT" | jq -r '.insaneRevenue')
MISSING_PRICE=$(echo "$HEALTH_RESULT" | jq -r '.missingPrice')
WITH_PRICE_DATA=$(echo "$HEALTH_RESULT" | jq -r '.withPriceData')
EXTREME_CHANGES=$(echo "$HEALTH_RESULT" | jq -r '.extremePriceChanges')
BIGINT_ISSUES=$(echo "$HEALTH_RESULT" | jq -r '.bigIntIssues')

echo "📊 Health Check Results:"
echo "  Total records: $TOTAL"
echo "  Stale data: $STALE"
echo "  With price data: $WITH_PRICE_DATA/$TOTAL"
echo "  Insane revenue values: $INSANE_REVENUE"
echo "  Missing price data: $MISSING_PRICE"
echo "  Extreme price changes: $EXTREME_CHANGES"
echo "  BigInt serialization issues: $BIGINT_ISSUES"

# Determine health status
ISSUES=0
if [ "$INSANE_REVENUE" -gt 0 ]; then
    echo "❌ Found $INSANE_REVENUE records with insane revenue values"
    ISSUES=$((ISSUES + 1))
fi

if [ "$BIGINT_ISSUES" -gt 0 ]; then
    echo "❌ Found $BIGINT_ISSUES records with BigInt serialization issues"
    ISSUES=$((ISSUES + 1))
fi

if [ "$EXTREME_CHANGES" -gt 0 ]; then
    echo "⚠️  Found $EXTREME_CHANGES records with extreme price changes"
    ISSUES=$((ISSUES + 1))
fi

if [ "$MISSING_PRICE" -gt 0 ]; then
    echo "⚠️  Found $MISSING_PRICE records with missing price data"
    ISSUES=$((ISSUES + 1))
fi

# Final status
if [ "$ISSUES" -eq 0 ]; then
    echo "🎉 API is healthy! All checks passed."
    exit 0
else
    echo "⚠️  Found $ISSUES issues. API needs attention."
    exit 1
fi
