#!/bin/bash

# Health Check Script for Migration
# Usage: ./scripts/health-check.sh

set -e

echo "🏥 Starting health check for migrated application..."

# Server details
SERVER="89.185.250.213"
USER="root"
PROJECT_DIR="/opt/earnings-table"

# Function to run commands on server
run_remote() {
    ssh $USER@$SERVER "$1"
}

# Function to check if service is healthy
check_service() {
    local service_name=$1
    local health_url=$2
    
    echo "🔍 Checking $service_name..."
    
    if run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml ps $service_name | grep -q 'Up'"; then
        echo "✅ $service_name is running"
        return 0
    else
        echo "❌ $service_name is not running"
        return 1
    fi
}

# Function to check API endpoint
check_api() {
    local endpoint=$1
    local expected_status=$2
    
    echo "🔍 Checking API endpoint: $endpoint"
    
    if run_remote "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000$endpoint | grep -q '$expected_status'"; then
        echo "✅ API endpoint $endpoint is responding with $expected_status"
        return 0
    else
        echo "❌ API endpoint $endpoint is not responding correctly"
        return 1
    fi
}

# Function to check database connection
check_database() {
    echo "🔍 Checking database connection..."
    
    if run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml exec -T postgres psql -U earnings_user -d earnings_table -c 'SELECT 1;' > /dev/null 2>&1"; then
        echo "✅ Database connection is working"
        return 0
    else
        echo "❌ Database connection failed"
        return 1
    fi
}

# Function to check Redis connection
check_redis() {
    echo "🔍 Checking Redis connection..."
    
    if run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml exec -T redis redis-cli ping | grep -q 'PONG'"; then
        echo "✅ Redis connection is working"
        return 0
    else
        echo "❌ Redis connection failed"
        return 1
    fi
}

# Main health check
echo "📋 Starting comprehensive health check..."

# Check services
check_service "postgres" || exit 1
check_service "redis" || exit 1
check_service "app" || exit 1
check_service "cron-worker" || exit 1

# Check database
check_database || exit 1

# Check Redis
check_redis || exit 1

# Check API endpoints
check_api "/api/earnings" "200" || exit 1
check_api "/api/earnings/stats" "200" || exit 1

# Check if application is accessible from outside
echo "🔍 Checking external accessibility..."
if curl -s -o /dev/null -w '%{http_code}' http://$SERVER:3000 | grep -q "200"; then
    echo "✅ Application is accessible from outside"
else
    echo "❌ Application is not accessible from outside"
    exit 1
fi

echo "🎉 All health checks passed! Application is healthy and ready."
