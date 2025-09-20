#!/bin/bash

# Monitoring and Logging Setup Script
# Usage: ./scripts/setup-monitoring.sh

set -e

# Server details
SERVER="89.185.250.213"
USER="root"
PROJECT_DIR="/opt/earnings-table"

# Function to run commands on server
run_remote() {
    ssh $USER@$SERVER "$1"
}

echo "📊 Setting up monitoring and logging..."

# Create monitoring directory
run_remote "mkdir -p $PROJECT_DIR/monitoring"

# Create log rotation configuration
run_remote "cat > $PROJECT_DIR/monitoring/logrotate.conf << 'EOF'
$PROJECT_DIR/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker-compose -f $PROJECT_DIR/deployment/docker-compose.yml restart app cron-worker
    endscript
}
EOF"

# Create monitoring script
run_remote "cat > $PROJECT_DIR/monitoring/monitor.sh << 'EOF'
#!/bin/bash

# Application Monitoring Script
LOG_FILE=\"$PROJECT_DIR/monitoring/monitor.log\"
ALERT_EMAIL=\"admin@example.com\"

# Function to log with timestamp
log() {
    echo \"\$(date '+%Y-%m-%d %H:%M:%S') - \$1\" >> \"\$LOG_FILE\"
}

# Function to check service health
check_service() {
    local service_name=\$1
    local container_name=\$2
    
    if docker ps | grep -q \"\$container_name\"; then
        log \"✅ \$service_name is running\"
        return 0
    else
        log \"❌ \$service_name is not running\"
        return 1
    fi
}

# Function to check API endpoint
check_api() {
    local endpoint=\$1
    local expected_status=\$2
    
    local status_code=\$(curl -s -o /dev/null -w '%{http_code}' \"http://localhost:3000\$endpoint\")
    
    if [ \"\$status_code\" = \"\$expected_status\" ]; then
        log \"✅ API \$endpoint is responding with \$status_code\"
        return 0
    else
        log \"❌ API \$endpoint is responding with \$status_code (expected \$expected_status)\"
        return 1
    fi
}

# Function to check disk space
check_disk_space() {
    local usage=\$(df / | awk 'NR==2 {print \$5}' | sed 's/%//')
    
    if [ \"\$usage\" -gt 80 ]; then
        log \"⚠️ Disk usage is high: \$usage%\"
        return 1
    else
        log \"✅ Disk usage is normal: \$usage%\"
        return 0
    fi
}

# Function to check memory usage
check_memory() {
    local usage=\$(free | awk 'NR==2{printf \"%.0f\", \$3*100/\$2}')
    
    if [ \"\$usage\" -gt 80 ]; then
        log \"⚠️ Memory usage is high: \$usage%\"
        return 1
    else
        log \"✅ Memory usage is normal: \$usage%\"
        return 0
    fi
}

# Function to check database connection
check_database() {
    if docker-compose -f $PROJECT_DIR/deployment/docker-compose.yml exec -T postgres psql -U earnings_user -d earnings_table -c 'SELECT 1;' > /dev/null 2>&1; then
        log \"✅ Database connection is working\"
        return 0
    else
        log \"❌ Database connection failed\"
        return 1
    fi
}

# Function to check Redis connection
check_redis() {
    if docker-compose -f $PROJECT_DIR/deployment/docker-compose.yml exec -T redis redis-cli ping | grep -q 'PONG'; then
        log \"✅ Redis connection is working\"
        return 0
    else
        log \"❌ Redis connection failed\"
        return 1
    fi
}

# Main monitoring function
main() {
    log \"🔍 Starting health check...\"
    
    local errors=0
    
    # Check services
    check_service \"PostgreSQL\" \"earnings-postgres\" || errors=\$((errors + 1))
    check_service \"Redis\" \"earnings-redis\" || errors=\$((errors + 1))
    check_service \"Application\" \"earnings-app\" || errors=\$((errors + 1))
    check_service \"Cron Worker\" \"earnings-cron\" || errors=\$((errors + 1))
    
    # Check API endpoints
    check_api \"/api/earnings\" \"200\" || errors=\$((errors + 1))
    check_api \"/api/earnings/stats\" \"200\" || errors=\$((errors + 1))
    
    # Check system resources
    check_disk_space || errors=\$((errors + 1))
    check_memory || errors=\$((errors + 1))
    
    # Check database and Redis
    check_database || errors=\$((errors + 1))
    check_redis || errors=\$((errors + 1))
    
    if [ \"\$errors\" -eq 0 ]; then
        log \"🎉 All checks passed\"
    else
        log \"⚠️ \$errors errors detected\"
    fi
    
    log \"🔍 Health check completed\"
}

# Run main function
main
EOF"

# Make monitoring script executable
run_remote "chmod +x $PROJECT_DIR/monitoring/monitor.sh"

# Create cron job for monitoring
run_remote "cat > $PROJECT_DIR/monitoring/monitor.cron << 'EOF'
# Monitor application every 5 minutes
*/5 * * * * $PROJECT_DIR/monitoring/monitor.sh

# Rotate logs daily
0 0 * * * /usr/sbin/logrotate $PROJECT_DIR/monitoring/logrotate.conf

# Clean old logs weekly
0 0 * * 0 find $PROJECT_DIR/monitoring -name '*.log.*' -mtime +7 -delete
EOF"

# Install cron job
run_remote "crontab $PROJECT_DIR/monitoring/monitor.cron"

# Create log directory
run_remote "mkdir -p $PROJECT_DIR/logs"

# Create log aggregation script
run_remote "cat > $PROJECT_DIR/monitoring/aggregate-logs.sh << 'EOF'
#!/bin/bash

# Log Aggregation Script
LOG_DIR=\"$PROJECT_DIR/logs\"
AGGREGATE_LOG=\"\$LOG_DIR/aggregated.log\"

# Function to aggregate logs
aggregate_logs() {
    echo \"📊 Aggregating logs...\"
    
    # Get application logs
    docker-compose -f $PROJECT_DIR/deployment/docker-compose.yml logs --tail=100 app >> \"\$AGGREGATE_LOG\"
    
    # Get cron worker logs
    docker-compose -f $PROJECT_DIR/deployment/docker-compose.yml logs --tail=100 cron-worker >> \"\$AGGREGATE_LOG\"
    
    # Get system logs
    journalctl --since \"1 hour ago\" --no-pager >> \"\$AGGREGATE_LOG\"
    
    echo \"✅ Logs aggregated to \$AGGREGATE_LOG\"
}

# Run aggregation
aggregate_logs
EOF"

# Make log aggregation script executable
run_remote "chmod +x $PROJECT_DIR/monitoring/aggregate-logs.sh"

# Create performance monitoring script
run_remote "cat > $PROJECT_DIR/monitoring/performance.sh << 'EOF'
#!/bin/bash

# Performance Monitoring Script
PERF_LOG=\"$PROJECT_DIR/monitoring/performance.log\"

# Function to log with timestamp
log() {
    echo \"\$(date '+%Y-%m-%d %H:%M:%S') - \$1\" >> \"\$PERF_LOG\"
}

# Function to check response times
check_response_times() {
    local endpoint=\$1
    local response_time=\$(curl -s -o /dev/null -w '%{time_total}' \"http://localhost:3000\$endpoint\")
    
    log \"API \$endpoint response time: \${response_time}s\"
    
    # Alert if response time is too high
    if (( \$(echo \"\$response_time > 5.0\" | bc -l) )); then
        log \"⚠️ Slow response time for \$endpoint: \${response_time}s\"
    fi
}

# Function to check database performance
check_database_performance() {
    local query_time=\$(docker-compose -f $PROJECT_DIR/deployment/docker-compose.yml exec -T postgres psql -U earnings_user -d earnings_table -c \"EXPLAIN ANALYZE SELECT COUNT(*) FROM \\\"EarningsTickersToday\\\";\" | grep \"Execution Time\" | awk '{print \$3}')
    
    log \"Database query performance: \${query_time}ms\"
    
    # Alert if query time is too high
    if [ \"\${query_time%.*}\" -gt 1000 ]; then
        log \"⚠️ Slow database query: \${query_time}ms\"
    fi
}

# Function to check memory usage
check_memory_usage() {
    local app_memory=\$(docker stats --no-stream --format \"table {{.MemUsage}}\" earnings-app | tail -1 | awk '{print \$1}')
    local cron_memory=\$(docker stats --no-stream --format \"table {{.MemUsage}}\" earnings-cron | tail -1 | awk '{print \$1}')
    
    log \"Application memory usage: \$app_memory\"
    log \"Cron worker memory usage: \$cron_memory\"
}

# Function to check CPU usage
check_cpu_usage() {
    local app_cpu=\$(docker stats --no-stream --format \"table {{.CPUPerc}}\" earnings-app | tail -1)
    local cron_cpu=\$(docker stats --no-stream --format \"table {{.CPUPerc}}\" earnings-cron | tail -1)
    
    log \"Application CPU usage: \$app_cpu\"
    log \"Cron worker CPU usage: \$cron_cpu\"
}

# Main performance monitoring function
main() {
    log \"🔍 Starting performance monitoring...\"
    
    check_response_times \"/api/earnings\"
    check_response_times \"/api/earnings/stats\"
    check_database_performance
    check_memory_usage
    check_cpu_usage
    
    log \"🔍 Performance monitoring completed\"
}

# Run main function
main
EOF"

# Make performance monitoring script executable
run_remote "chmod +x $PROJECT_DIR/monitoring/performance.sh"

# Add performance monitoring to cron
run_remote "cat >> $PROJECT_DIR/monitoring/monitor.cron << 'EOF'

# Performance monitoring every 10 minutes
*/10 * * * * $PROJECT_DIR/monitoring/performance.sh
EOF"

# Update cron job
run_remote "crontab $PROJECT_DIR/monitoring/monitor.cron"

echo "✅ Monitoring and logging setup completed!"
echo "📊 Monitoring features:"
echo "   - Health checks every 5 minutes"
echo "   - Performance monitoring every 10 minutes"
echo "   - Log rotation daily"
echo "   - Log aggregation"
echo "   - System resource monitoring"
echo ""
echo "📁 Monitoring files:"
echo "   - $PROJECT_DIR/monitoring/monitor.sh"
echo "   - $PROJECT_DIR/monitoring/performance.sh"
echo "   - $PROJECT_DIR/monitoring/aggregate-logs.sh"
echo "   - $PROJECT_DIR/monitoring/logrotate.conf"
echo ""
echo "📋 Log files:"
echo "   - $PROJECT_DIR/monitoring/monitor.log"
echo "   - $PROJECT_DIR/monitoring/performance.log"
echo "   - $PROJECT_DIR/logs/aggregated.log"
