#!/bin/bash

# Fix Migration Issues Script
# Usage: ./scripts/fix-migration-issues.sh

set -e

# Configuration
SERVER="89.185.250.213"
USER="root"
PROJECT_DIR="/opt/earnings-table"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Function to run commands on server
run_remote() {
    ssh $USER@$SERVER "$1"
}

# Function to log with timestamp and color
log() {
    local color=$1
    local message=$2
    echo -e "\n${color}[$(date '+%Y-%m-%d %H:%M:%S')] $message${NC}"
}

# Function to diagnose the problem
diagnose_problem() {
    log $BLUE "🔍 Diagnosing the problem..."
    
    # Check if server is reachable
    if ping -c 1 $SERVER > /dev/null 2>&1; then
        log $GREEN "✅ Server is reachable"
    else
        log $RED "❌ Server is not reachable"
        exit 1
    fi
    
    # Check if project directory exists
    if run_remote "test -d $PROJECT_DIR"; then
        log $GREEN "✅ Project directory exists"
    else
        log $RED "❌ Project directory does not exist"
        log $YELLOW "💡 Need to redeploy the application"
        return 1
    fi
    
    # Check if Docker is running
    if run_remote "docker ps" > /dev/null 2>&1; then
        log $GREEN "✅ Docker is running"
    else
        log $RED "❌ Docker is not running"
        log $YELLOW "💡 Need to start Docker"
        return 1
    fi
    
    # Check if containers are running
    local containers=$(run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml ps -q")
    if [ -n "$containers" ]; then
        log $GREEN "✅ Some containers are running"
        run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml ps"
    else
        log $RED "❌ No containers are running"
        log $YELLOW "💡 Need to start containers"
        return 1
    fi
    
    return 0
}

# Function to fix Docker issues
fix_docker_issues() {
    log $BLUE "🔧 Fixing Docker issues..."
    
    # Stop all containers
    run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml down || true"
    log $GREEN "✅ Stopped all containers"
    
    # Remove old containers and images
    run_remote "docker system prune -f"
    log $GREEN "✅ Cleaned up Docker system"
    
    # Start services
    run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml up -d --build"
    log $GREEN "✅ Started services with rebuild"
    
    # Wait for services to start
    log $YELLOW "⏳ Waiting for services to start..."
    sleep 60
    
    # Check if services are running
    run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml ps"
}

# Function to check application logs
check_logs() {
    log $BLUE "📋 Checking application logs..."
    
    # Check application logs
    log $YELLOW "📱 Application logs:"
    run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml logs --tail=20 app"
    
    # Check database logs
    log $YELLOW "🗄️ Database logs:"
    run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml logs --tail=10 postgres"
    
    # Check cron logs
    log $YELLOW "⏰ Cron logs:"
    run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml logs --tail=10 cron"
}

# Function to test port accessibility
test_port() {
    log $BLUE "🔌 Testing port accessibility..."
    
    # Test local port
    if run_remote "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000" | grep -q "200"; then
        log $GREEN "✅ Port 3000 is accessible locally"
    else
        log $RED "❌ Port 3000 is not accessible locally"
        return 1
    fi
    
    # Test external port
    if curl -s -o /dev/null -w '%{http_code}' http://$SERVER:3000 | grep -q "200"; then
        log $GREEN "✅ Port 3000 is accessible externally"
    else
        log $RED "❌ Port 3000 is not accessible externally"
        log $YELLOW "💡 Check firewall settings"
        return 1
    fi
    
    return 0
}

# Function to check firewall
check_firewall() {
    log $BLUE "🔥 Checking firewall settings..."
    
    # Check if port 3000 is open
    if run_remote "ufw status | grep -q '3000'"; then
        log $GREEN "✅ Port 3000 is open in firewall"
    else
        log $YELLOW "⚠️ Port 3000 might not be open in firewall"
        log $YELLOW "💡 Opening port 3000..."
        run_remote "ufw allow 3000"
        log $GREEN "✅ Port 3000 opened in firewall"
    fi
}

# Function to redeploy if needed
redeploy_application() {
    log $BLUE "🚀 Redeploying application..."
    
    # Remove old project
    run_remote "rm -rf $PROJECT_DIR"
    
    # Create new project directory
    run_remote "mkdir -p $PROJECT_DIR"
    
    # Clone repository
    run_remote "cd $PROJECT_DIR && git clone https://github.com/dusan02/et_new.git ."
    
    # Set up production schema
    run_remote "cd $PROJECT_DIR && cp prisma/schema.prod.prisma prisma/schema.prisma"
    
    # Set up environment variables
    run_remote "cd $PROJECT_DIR && cp production.env .env"
    
    # Start services
    run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml up -d --build"
    
    log $GREEN "✅ Application redeployed"
}

# Main function
main() {
    echo -e "${PURPLE}🔧 Fixing Migration Issues${NC}"
    echo -e "${PURPLE}==========================${NC}"
    echo ""
    
    # Step 1: Diagnose the problem
    if ! diagnose_problem; then
        log $YELLOW "⚠️ Issues detected, attempting to fix..."
        
        # Step 2: Fix Docker issues
        fix_docker_issues
        
        # Step 3: Check firewall
        check_firewall
        
        # Step 4: Test port
        if ! test_port; then
            log $YELLOW "⚠️ Port still not accessible, redeploying..."
            redeploy_application
        fi
    fi
    
    # Step 5: Check logs
    check_logs
    
    # Step 6: Final test
    if test_port; then
        log $GREEN "🎉 All issues fixed!"
        echo ""
        echo -e "${CYAN}📊 Final Status:${NC}"
        echo -e "   🌐 Application: http://$SERVER:3000"
        echo -e "   📊 API: http://$SERVER:3000/api/earnings"
        echo -e "   📈 Stats: http://$SERVER:3000/api/earnings/stats"
    else
        log $RED "❌ Issues persist, manual intervention needed"
        echo ""
        echo -e "${YELLOW}🔧 Manual commands:${NC}"
        echo -e "   ssh $USER@$SERVER"
        echo -e "   cd $PROJECT_DIR"
        echo -e "   docker-compose -f deployment/docker-compose.yml logs -f"
        echo -e "   docker-compose -f deployment/docker-compose.yml restart"
    fi
}

# Run main function
main "$@"
