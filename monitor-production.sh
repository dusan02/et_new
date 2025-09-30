#!/bin/bash

# Production Monitoring Script for earningstable.com

echo "📊 Production Monitoring Dashboard"
echo "=================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

# Check PM2 status
echo "🔍 PM2 Process Status:"
pm2 status

echo ""
echo "🌐 Application Health:"
# Check if application is responding
if curl -f -s http://localhost:3000/api/monitoring/health > /dev/null; then
    print_status "Application is healthy"
else
    print_error "Application health check failed"
fi

echo ""
echo "📈 API Endpoints Status:"
# Check main API endpoints
endpoints=(
    "http://localhost:3000/api/earnings"
    "http://localhost:3000/api/earnings/stats"
    "http://localhost:3000/api/monitoring/health"
)

for endpoint in "${endpoints[@]}"; do
    if curl -f -s "$endpoint" > /dev/null; then
        print_status "$endpoint"
    else
        print_error "$endpoint"
    fi
done

echo ""
echo "💾 System Resources:"
# Check memory usage
memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
echo "Memory Usage: ${memory_usage}%"

# Check disk usage
disk_usage=$(df -h / | awk 'NR==2{printf "%s", $5}')
echo "Disk Usage: $disk_usage"

# Check CPU load
cpu_load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
echo "CPU Load: $cpu_load"

echo ""
echo "🔄 Recent Logs (last 10 lines):"
pm2 logs earningstable --lines 10

echo ""
echo "📊 Application URLs:"
echo "Production: https://earningstable.com"
echo "Direct IP: http://89.185.250.213:3000"
echo "Health Check: http://89.185.250.213:3000/api/monitoring/health"
