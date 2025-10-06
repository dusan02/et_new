#!/bin/bash
set -e

echo "📊 Monitoring Zero Change Ratio on Production"
echo "============================================"

PROD_HEALTH_URL="https://www.earningstable.com/api/health?detailed=1"
PROD_CLEAR_CACHE_URL="https://www.earningstable.com/api/earnings/clear-cache"
PROD_DEBUG_URL="https://www.earningstable.com/api/earnings?debug=1&nocache=1"
THRESHOLD_ZERO_CHANGE=0.7 # If more than 70% of tickers have 0% change, it's unhealthy
MIN_TICKERS=5 # Only monitor if there are at least this many tickers

echo "Fetching health data from: $PROD_HEALTH_URL"
HEALTH_RESPONSE=$(curl -s "$PROD_HEALTH_URL")

if [ -z "$HEALTH_RESPONSE" ]; then
    echo "❌ Failed to fetch health data. Exiting."
    exit 1
fi

echo "Raw Health Response:"
echo "$HEALTH_RESPONSE" | jq .

STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status')
READY=$(echo "$HEALTH_RESPONSE" | jq -r '.ready')
TOTAL_TICKERS=$(echo "$HEALTH_RESPONSE" | jq -r '.dataQuality.totalTickers // 0')
ZERO_CHANGE_TICKERS=$(echo "$HEALTH_RESPONSE" | jq -r '.dataQuality.zeroChangeTickers // 0')
RATIO_ZERO_CHANGE=$(echo "$HEALTH_RESPONSE" | jq -r '.dataQuality.ratioZeroChange // 0')
IS_HEALTHY=$(echo "$HEALTH_RESPONSE" | jq -r '.dataQuality.isHealthy // true')
MARKET_SESSION=$(echo "$HEALTH_RESPONSE" | jq -r '.marketSession // "unknown"')

echo "--- Health Metrics ---"
echo "Status: $STATUS"
echo "Ready: $READY"
echo "Market Session: $MARKET_SESSION"
echo "Total Tickers: $TOTAL_TICKERS"
echo "Zero Change Tickers: $ZERO_CHANGE_TICKERS"
echo "Ratio Zero Change: $RATIO_ZERO_CHANGE"
echo "Is Healthy: $IS_HEALTHY"

if [ "$MARKET_SESSION" = "rth" ] && [ "$TOTAL_TICKERS" -ge "$MIN_TICKERS" ]; then
    if [ "$IS_HEALTHY" = "false" ]; then
        echo "🚨 ALERT: Unhealthy data detected! Ratio of zero change tickers ($RATIO_ZERO_CHANGE) is above threshold ($THRESHOLD_ZERO_CHANGE)."
        echo "Attempting to clear cache: $PROD_CLEAR_CACHE_URL"
        CLEAR_CACHE_RESPONSE=$(curl -s -X POST "$PROD_CLEAR_CACHE_URL")
        echo "Cache Clear Response: $CLEAR_CACHE_RESPONSE"
        
        if echo "$CLEAR_CACHE_RESPONSE" | grep -q "cache cleared"; then
            echo "✅ Cache cleared successfully. Re-checking health in 10 seconds..."
            sleep 10
            
            RECHECK_HEALTH_RESPONSE=$(curl -s "$PROD_HEALTH_URL")
            RECHECK_IS_HEALTHY=$(echo "$RECHECK_HEALTH_RESPONSE" | jq -r '.dataQuality.isHealthy // true')
            
            if [ "$RECHECK_IS_HEALTHY" = "true" ]; then
                echo "✅ Health restored after cache clear."
                exit 0
            else
                echo "❌ Health still unhealthy after cache clear. Manual intervention may be required."
                exit 1
            fi
        else
            echo "❌ Failed to clear cache. Manual intervention may be required."
            exit 1
        fi
    else
        echo "✅ Data is healthy. No action needed."
        exit 0
    fi
elif [ "$MARKET_SESSION" = "closed" ]; then
    echo "ℹ️ Market is closed. Monitoring is less critical, but data is currently $IS_HEALTHY."
    exit 0
else
    echo "ℹ️ Not enough tickers ($TOTAL_TICKERS) to monitor or market session unknown. No action needed."
    exit 0
fi