#!/bin/bash

# Production Server Fix Commands
# Run these commands on server 89.185.250.213 after SSH connection

echo "🔧 Fixing EarningsTable Production Server"
echo "======================================="
echo "Server: 89.185.250.213"
echo "Date: $(date)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Step 1: Check current status
print_status "Checking current application status..."
echo "Current directory: $(pwd)"
echo "Running processes:"
ps aux | grep -E "(node|next|earnings)" | grep -v grep || echo "No Node.js processes found"

echo ""
print_status "Checking if application directory exists..."
if [ -d "/var/www/earnings-table" ]; then
    print_success "Application directory exists"
    cd /var/www/earnings-table
    pwd
    ls -la
else
    print_error "Application directory not found"
    print_status "Available directories in /var/www/:"
    ls -la /var/www/ || print_warning "/var/www/ directory doesn't exist"
    
    # Try alternative locations
    print_status "Checking alternative locations..."
    for dir in "/opt/earnings-table" "/home/earnings" "/root/earnings-table"; do
        if [ -d "$dir" ]; then
            print_success "Found application at: $dir"
            cd "$dir"
            break
        fi
    done
fi

# Step 2: Stop existing processes
print_status "Stopping existing application processes..."
pkill -f "next" 2>/dev/null && print_success "Stopped Next.js processes" || print_warning "No Next.js processes to stop"
pkill -f "earnings" 2>/dev/null && print_success "Stopped earnings processes" || print_warning "No earnings processes to stop"

# Check for systemd services
if systemctl is-active --quiet earnings-table 2>/dev/null; then
    print_status "Stopping systemd service..."
    systemctl stop earnings-table
    print_success "Stopped earnings-table service"
fi

if systemctl is-active --quiet earnings-app 2>/dev/null; then
    print_status "Stopping systemd service..."
    systemctl stop earnings-app
    print_success "Stopped earnings-app service"
fi

# Step 3: Check Node.js and npm
print_status "Checking Node.js and npm versions..."
node --version || print_error "Node.js not installed"
npm --version || print_error "npm not installed"

# Step 4: Install/update dependencies
print_status "Installing dependencies..."
if [ -f "package.json" ]; then
    npm ci --production
    print_success "Dependencies installed"
else
    print_error "package.json not found in current directory"
    print_status "Current directory contents:"
    ls -la
    exit 1
fi

# Step 5: Generate Prisma client
print_status "Generating Prisma client..."
if [ -f "prisma/schema.prisma" ]; then
    npx prisma generate
    print_success "Prisma client generated"
else
    print_warning "Prisma schema not found, skipping..."
fi

# Step 6: Build the application
print_status "Building Next.js application..."
npm run build

# Check if build was successful
if [ -d ".next" ] && [ -f ".next/server/app/page.js" ]; then
    print_success "Build completed successfully!"
    print_status "Build contents:"
    ls -la .next/
    ls -la .next/server/app/ 2>/dev/null || true
else
    print_error "Build failed - .next/server/app/page.js not found"
    print_status "Checking .next directory:"
    ls -la .next/ 2>/dev/null || print_error ".next directory doesn't exist"
    exit 1
fi

# Step 7: Start the application
print_status "Starting the application..."

# Try systemd service first
if [ -f "/etc/systemd/system/earnings-table.service" ]; then
    print_status "Starting via systemd..."
    systemctl start earnings-table
    sleep 5
    if systemctl is-active --quiet earnings-table; then
        print_success "Application started via systemd"
    else
        print_warning "Systemd service failed, trying manual start..."
        NODE_ENV=production nohup npm start > app.log 2>&1 &
        print_success "Application started manually"
    fi
else
    print_status "Starting manually..."
    NODE_ENV=production nohup npm start > app.log 2>&1 &
    print_success "Application started manually"
fi

# Step 8: Wait and test
print_status "Waiting for application to start..."
sleep 10

# Test the application
print_status "Testing application..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_success "Application is responding on port 3000!"
    
    # Test API endpoints
    if curl -f http://localhost:3000/api/earnings > /dev/null 2>&1; then
        print_success "API endpoints are working!"
    else
        print_warning "Main app works but API might have issues"
    fi
    
    # Show public access
    print_success "🌐 Application is now available at:"
    echo "   http://89.185.250.213:3000"
    
else
    print_error "Application is not responding"
    print_status "Checking logs..."
    tail -n 20 app.log 2>/dev/null || echo "No app.log found"
    
    print_status "Checking processes..."
    ps aux | grep -E "(node|next)" | grep -v grep
    
    print_status "Checking systemd status..."
    systemctl status earnings-table --no-pager 2>/dev/null || echo "No systemd service"
fi

# Step 9: Show status
print_status "Final status check..."
echo ""
echo "🔍 Process status:"
ps aux | grep -E "(node|next|earnings)" | grep -v grep || echo "No processes found"
echo ""
echo "🌐 Port status:"
netstat -tlnp | grep :3000 || echo "Port 3000 not in use"
echo ""
echo "📋 Recent logs:"
tail -n 10 app.log 2>/dev/null || echo "No logs available"

print_success "🎉 Production fix completed!"
echo ""
print_status "Next steps:"
echo "1. Test the application: http://89.185.250.213:3000"
echo "2. Check if data is loading properly"
echo "3. Monitor logs: tail -f app.log"
echo "4. For HTTPS setup, run the HTTPS deployment script"
