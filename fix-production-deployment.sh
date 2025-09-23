#!/bin/bash

# Fix Production Deployment Script
# This script will diagnose and fix the ENOENT error on your production server

set -e

echo "🔧 EarningsTable Production Fix Script"
echo "======================================"
echo "📅 Date: $(date)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're on the server
print_status "Checking deployment environment..."

# Method 1: Check if Docker containers are running
print_status "Checking Docker deployment..."
if command -v docker &> /dev/null; then
    echo "Docker is installed"
    
    if docker ps | grep earnings-app > /dev/null 2>&1; then
        print_warning "Docker containers are running but application has issues"
        echo "Current container status:"
        docker ps --filter "name=earnings"
        
        print_status "Checking container logs..."
        docker logs earnings-app --tail=20
        
        print_status "Rebuilding Docker containers..."
        docker-compose down
        docker-compose build --no-cache
        docker-compose up -d
        
        print_success "Docker containers rebuilt and restarted"
        
        # Wait for startup
        print_status "Waiting for application to start..."
        sleep 30
        
        # Test the application
        if curl -f http://localhost:3000 > /dev/null 2>&1; then
            print_success "Application is now working!"
        else
            print_error "Application still not responding"
            docker logs earnings-app --tail=50
        fi
    else
        print_warning "Docker containers are not running"
        print_status "Starting Docker deployment..."
        
        # Make sure we have all required files
        if [ ! -f "docker-compose.prod.yml" ] && [ ! -f "docker-compose.yml" ]; then
            print_error "Docker compose file not found!"
            exit 1
        fi
        
        # Use production compose file if available
        COMPOSE_FILE="docker-compose.yml"
        if [ -f "docker-compose.prod.yml" ]; then
            COMPOSE_FILE="docker-compose.prod.yml"
        fi
        
        print_status "Building and starting containers with $COMPOSE_FILE..."
        docker-compose -f $COMPOSE_FILE down --remove-orphans
        docker-compose -f $COMPOSE_FILE build --no-cache
        docker-compose -f $COMPOSE_FILE up -d
        
        print_success "Docker containers started"
    fi
else
    # Method 2: Check if it's a direct deployment in /var/www/
    print_status "Checking direct deployment..."
    
    if [ -d "/var/www/earnings-table" ]; then
        print_warning "Found direct deployment in /var/www/earnings-table"
        print_status "Rebuilding direct deployment..."
        
        cd /var/www/earnings-table
        
        # Install dependencies
        print_status "Installing dependencies..."
        npm ci --production
        
        # Generate Prisma client
        print_status "Generating Prisma client..."
        npx prisma generate
        
        # Build the application
        print_status "Building application..."
        npm run build
        
        # Check if we need to restart services
        if systemctl is-active --quiet earnings-table; then
            print_status "Restarting application service..."
            sudo systemctl restart earnings-table
        fi
        
        if systemctl is-active --quiet earnings-cron; then
            print_status "Restarting cron service..."
            sudo systemctl restart earnings-cron
        fi
        
        print_success "Direct deployment rebuilt"
    else
        print_error "No deployment found in /var/www/earnings-table"
        print_status "Setting up new deployment..."
        
        # Create deployment directory
        sudo mkdir -p /var/www/earnings-table
        sudo chown $USER:$USER /var/www/earnings-table
        
        # Copy files
        cp -r . /var/www/earnings-table/
        cd /var/www/earnings-table
        
        # Install and build
        npm ci --production
        npx prisma generate
        npm run build
        
        print_success "New deployment created"
    fi
fi

# Final health check
print_status "Performing final health check..."
sleep 10

# Try different ports and methods
HEALTH_CHECK_PASSED=false

for port in 3000 80 443; do
    for protocol in http https; do
        if curl -f -m 10 ${protocol}://localhost:${port}/api/earnings > /dev/null 2>&1; then
            print_success "Application is healthy at ${protocol}://localhost:${port}"
            HEALTH_CHECK_PASSED=true
            break 2
        fi
    done
done

if [ "$HEALTH_CHECK_PASSED" = false ]; then
    print_warning "Health check failed. Checking common issues..."
    
    # Check if port 3000 is in use
    if netstat -tlnp | grep :3000 > /dev/null 2>&1; then
        print_success "Port 3000 is in use"
        print_status "Process using port 3000:"
        netstat -tlnp | grep :3000
    else
        print_error "Port 3000 is not in use"
    fi
    
    # Check logs if available
    if command -v docker &> /dev/null && docker ps | grep earnings-app > /dev/null 2>&1; then
        print_status "Recent Docker logs:"
        docker logs earnings-app --tail=30
    fi
    
    if systemctl is-active --quiet earnings-table; then
        print_status "Recent systemd logs:"
        journalctl -u earnings-table --no-pager --lines=30
    fi
fi

echo ""
print_status "Fix script completed!"
echo ""
print_status "Useful commands for monitoring:"
echo "  - Check Docker: docker ps && docker logs earnings-app"
echo "  - Check systemd: sudo systemctl status earnings-table"
echo "  - Check logs: journalctl -u earnings-table -f"
echo "  - Test API: curl http://localhost:3000/api/earnings"
echo ""
