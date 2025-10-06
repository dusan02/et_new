#!/bin/bash
set -e

echo "🔍 MONITORING ZERO CHANGES DETECTION"
echo "===================================="

# Configuration
API_URL="https://www.earningstable.com/api/health?detailed=1"
THRESHOLD=0.7
CHECK_INTERVAL=300 # 5 minutes
MAX_ALERTS=3
ALERT_COUNT=0

# Function to check health
check_health() {
    echo "⏰ $(date): Checking health..."
    
    local response=$(curl -s "$API_URL")
    local status=$(echo "$response" | jq -r '.status // "error"')
    local ratio=$(echo "$response" | jq -r '.dataQuality.ratioZeroChange // 1')
    local total=$(echo "$response" | jq -r '.dataQuality.totalTickers // 0')
    local session=$(echo "$response" | jq -r '.marketSession // "unknown"')
    
    echo "   Status: $status"
    echo "   Market Session: $session"
    echo "   Total Tickers: $total"
    echo "   Zero Change Ratio: $ratio"
    
    # Check if we need to alert
    if [ "$status" = "warning" ] && [ "$(echo "$ratio > $THRESHOLD" | bc -l)" -eq 1 ]; then
        echo "⚠️  ALERT: High zero change ratio detected: $ratio (threshold: $THRESHOLD)"
        
        if [ $ALERT_COUNT -lt $MAX_ALERTS ]; then
            echo "🚨 Clearing cache to remediate..."
            curl -s -X POST "https://www.earningstable.com/api/earnings/clear-cache"
            echo "✅ Cache cleared"
            ALERT_COUNT=$((ALERT_COUNT + 1))
        else
            echo "❌ Max alerts reached ($MAX_ALERTS). Manual intervention required."
        fi
    else
        echo "✅ Health check passed"
        ALERT_COUNT=0 # Reset counter on healthy state
    fi
    
    echo ""
}

# Main monitoring loop
echo "Starting monitoring with $CHECK_INTERVAL second intervals..."
echo "Threshold: $THRESHOLD (70% zero changes)"
echo "Max alerts per session: $MAX_ALERTS"
echo ""

while true; do
    check_health
    sleep $CHECK_INTERVAL
done
