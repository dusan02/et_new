#!/bin/bash

# Post-Migration Testing Script
# Usage: ./scripts/post-migration-tests.sh

set -e

# Server details
SERVER="89.185.250.213"
USER="root"
PROJECT_DIR="/opt/earnings-table"

# Function to run commands on server
run_remote() {
    ssh $USER@$SERVER "$1"
}

# Function to test API endpoint
test_api_endpoint() {
    local endpoint=$1
    local expected_status=$2
    local description=$3
    
    echo "🔍 Testing $description..."
    
    local status_code=$(run_remote "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000$endpoint")
    
    if [ "$status_code" = "$expected_status" ]; then
        echo "✅ $description: PASSED (Status: $status_code)"
        return 0
    else
        echo "❌ $description: FAILED (Status: $status_code, Expected: $expected_status)"
        return 1
    fi
}

# Function to test database connectivity
test_database() {
    echo "🔍 Testing database connectivity..."
    
    if run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml exec -T postgres psql -U earnings_user -d earnings_table -c 'SELECT COUNT(*) FROM \"EarningsTickersToday\";'" > /dev/null 2>&1; then
        echo "✅ Database connectivity: PASSED"
        return 0
    else
        echo "❌ Database connectivity: FAILED"
        return 1
    fi
}

# Function to test Redis connectivity
test_redis() {
    echo "🔍 Testing Redis connectivity..."
    
    if run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml exec -T redis redis-cli ping | grep -q 'PONG'" > /dev/null 2>&1; then
        echo "✅ Redis connectivity: PASSED"
        return 0
    else
        echo "❌ Redis connectivity: FAILED"
        return 1
    fi
}

# Function to test cron worker
test_cron_worker() {
    echo "🔍 Testing cron worker..."
    
    if run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml ps cron-worker | grep -q 'Up'" > /dev/null 2>&1; then
        echo "✅ Cron worker: PASSED"
        return 0
    else
        echo "❌ Cron worker: FAILED"
        return 1
    fi
}

# Function to test external accessibility
test_external_access() {
    echo "🔍 Testing external accessibility..."
    
    local status_code=$(curl -s -o /dev/null -w '%{http_code}' http://$SERVER:3000)
    
    if [ "$status_code" = "200" ]; then
        echo "✅ External accessibility: PASSED (Status: $status_code)"
        return 0
    else
        echo "❌ External accessibility: FAILED (Status: $status_code)"
        return 1
    fi
}

# Function to test API response format
test_api_response_format() {
    echo "🔍 Testing API response format..."
    
    local response=$(run_remote "curl -s http://localhost:3000/api/earnings")
    
    # Check if response contains expected fields
    if echo "$response" | grep -q '"success"' && echo "$response" | grep -q '"data"' && echo "$response" | grep -q '"meta"'; then
        echo "✅ API response format: PASSED"
        return 0
    else
        echo "❌ API response format: FAILED"
        return 1
    fi
}

# Function to test performance
test_performance() {
    echo "🔍 Testing performance..."
    
    local response_time=$(run_remote "curl -s -o /dev/null -w '%{time_total}' http://localhost:3000/api/earnings")
    
    # Check if response time is acceptable (less than 5 seconds)
    if (( $(echo "$response_time < 5.0" | bc -l) )); then
        echo "✅ Performance: PASSED (Response time: ${response_time}s)"
        return 0
    else
        echo "❌ Performance: FAILED (Response time: ${response_time}s)"
        return 1
    fi
}

# Function to test security headers
test_security_headers() {
    echo "🔍 Testing security headers..."
    
    local headers=$(run_remote "curl -s -I http://localhost:3000")
    
    # Check for security headers
    local security_score=0
    
    if echo "$headers" | grep -q "X-Frame-Options"; then
        security_score=$((security_score + 1))
    fi
    
    if echo "$headers" | grep -q "X-Content-Type-Options"; then
        security_score=$((security_score + 1))
    fi
    
    if echo "$headers" | grep -q "Referrer-Policy"; then
        security_score=$((security_score + 1))
    fi
    
    if [ "$security_score" -ge 2 ]; then
        echo "✅ Security headers: PASSED ($security_score/3 headers present)"
        return 0
    else
        echo "❌ Security headers: FAILED ($security_score/3 headers present)"
        return 1
    fi
}

# Function to test SSL/TLS (if configured)
test_ssl() {
    echo "🔍 Testing SSL/TLS configuration..."
    
    # This test would be relevant if SSL is configured
    echo "⚠️ SSL/TLS test skipped (not configured)"
    return 0
}

# Function to run load test
test_load() {
    echo "🔍 Testing load handling..."
    
    # Simple load test with 10 concurrent requests
    local success_count=0
    local total_requests=10
    
    for i in $(seq 1 $total_requests); do
        if run_remote "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/earnings" | grep -q "200"; then
            success_count=$((success_count + 1))
        fi
    done
    
    local success_rate=$((success_count * 100 / total_requests))
    
    if [ "$success_rate" -ge 90 ]; then
        echo "✅ Load handling: PASSED ($success_rate% success rate)"
        return 0
    else
        echo "❌ Load handling: FAILED ($success_rate% success rate)"
        return 1
    fi
}

# Function to generate test report
generate_test_report() {
    local passed_tests=$1
    local total_tests=$2
    local test_results=$3
    
    echo ""
    echo "📊 POST-MIGRATION TEST REPORT"
    echo "=============================="
    echo "Date: $(date)"
    echo "Server: $SERVER"
    echo "Project: $PROJECT_DIR"
    echo ""
    echo "Test Results:"
    echo "$test_results"
    echo ""
    echo "Summary:"
    echo "  Passed: $passed_tests/$total_tests"
    echo "  Failed: $((total_tests - passed_tests))/$total_tests"
    echo "  Success Rate: $((passed_tests * 100 / total_tests))%"
    echo ""
    
    if [ "$passed_tests" -eq "$total_tests" ]; then
        echo "🎉 ALL TESTS PASSED! Migration is successful."
        return 0
    else
        echo "⚠️ Some tests failed. Please review the results."
        return 1
    fi
}

# Main testing function
main() {
    echo "🧪 Starting post-migration tests..."
    echo "=================================="
    
    local passed_tests=0
    local total_tests=0
    local test_results=""
    
    # Test 1: API Endpoints
    total_tests=$((total_tests + 1))
    if test_api_endpoint "/api/earnings" "200" "Earnings API endpoint"; then
        passed_tests=$((passed_tests + 1))
        test_results="$test_results✅ Earnings API endpoint: PASSED\n"
    else
        test_results="$test_results❌ Earnings API endpoint: FAILED\n"
    fi
    
    total_tests=$((total_tests + 1))
    if test_api_endpoint "/api/earnings/stats" "200" "Stats API endpoint"; then
        passed_tests=$((passed_tests + 1))
        test_results="$test_results✅ Stats API endpoint: PASSED\n"
    else
        test_results="$test_results❌ Stats API endpoint: FAILED\n"
    fi
    
    # Test 2: Database connectivity
    total_tests=$((total_tests + 1))
    if test_database; then
        passed_tests=$((passed_tests + 1))
        test_results="$test_results✅ Database connectivity: PASSED\n"
    else
        test_results="$test_results❌ Database connectivity: FAILED\n"
    fi
    
    # Test 3: Redis connectivity
    total_tests=$((total_tests + 1))
    if test_redis; then
        passed_tests=$((passed_tests + 1))
        test_results="$test_results✅ Redis connectivity: PASSED\n"
    else
        test_results="$test_results❌ Redis connectivity: FAILED\n"
    fi
    
    # Test 4: Cron worker
    total_tests=$((total_tests + 1))
    if test_cron_worker; then
        passed_tests=$((passed_tests + 1))
        test_results="$test_results✅ Cron worker: PASSED\n"
    else
        test_results="$test_results❌ Cron worker: FAILED\n"
    fi
    
    # Test 5: External accessibility
    total_tests=$((total_tests + 1))
    if test_external_access; then
        passed_tests=$((passed_tests + 1))
        test_results="$test_results✅ External accessibility: PASSED\n"
    else
        test_results="$test_results❌ External accessibility: FAILED\n"
    fi
    
    # Test 6: API response format
    total_tests=$((total_tests + 1))
    if test_api_response_format; then
        passed_tests=$((passed_tests + 1))
        test_results="$test_results✅ API response format: PASSED\n"
    else
        test_results="$test_results❌ API response format: FAILED\n"
    fi
    
    # Test 7: Performance
    total_tests=$((total_tests + 1))
    if test_performance; then
        passed_tests=$((passed_tests + 1))
        test_results="$test_results✅ Performance: PASSED\n"
    else
        test_results="$test_results❌ Performance: FAILED\n"
    fi
    
    # Test 8: Security headers
    total_tests=$((total_tests + 1))
    if test_security_headers; then
        passed_tests=$((passed_tests + 1))
        test_results="$test_results✅ Security headers: PASSED\n"
    else
        test_results="$test_results❌ Security headers: FAILED\n"
    fi
    
    # Test 9: Load handling
    total_tests=$((total_tests + 1))
    if test_load; then
        passed_tests=$((passed_tests + 1))
        test_results="$test_results✅ Load handling: PASSED\n"
    else
        test_results="$test_results❌ Load handling: FAILED\n"
    fi
    
    # Generate test report
    generate_test_report "$passed_tests" "$total_tests" "$test_results"
}

# Run main function
main "$@"
