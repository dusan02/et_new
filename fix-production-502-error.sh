#!/bin/bash

# Production 502 Bad Gateway Fix Script
# For earningstable.com on server 89.185.250.213
# Run this script on the production server

echo "🔧 Fixing 502 Bad Gateway Error on earningstable.com"
echo "=================================================="
echo "Server: root@89.185.250.213"
echo "Domain: earningstable.com"
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
print_status "Step 1: Checking current system status..."
echo "Current user: $(whoami)"
echo "Current directory: $(pwd)"
echo "Server IP: $(curl -s ifconfig.me 2>/dev/null || echo 'Unknown')"

# Check if we're on the right server
if [ "$(curl -s ifconfig.me 2>/dev/null)" != "89.185.250.213" ]; then
    print_warning "Warning: This doesn't appear to be the production server (89.185.250.213)"
fi

# Step 2: Check running processes
print_status "Step 2: Checking running processes..."
echo "Node.js processes:"
ps aux | grep -E "(node|next)" | grep -v grep || echo "No Node.js processes found"

echo ""
echo "Nginx processes:"
ps aux | grep nginx | grep -v grep || echo "No Nginx processes found"

# Step 3: Check port usage
print_status "Step 3: Checking port usage..."
echo "Port 80 (HTTP):"
netstat -tlnp | grep :80 || echo "Port 80 not in use"

echo ""
echo "Port 443 (HTTPS):"
netstat -tlnp | grep :443 || echo "Port 443 not in use"

echo ""
echo "Port 3000 (App):"
netstat -tlnp | grep :3000 || echo "Port 3000 not in use"

# Step 4: Check application directory
print_status "Step 4: Checking application directory..."
APP_DIRS=("/var/www/earnings-table" "/var/www/earnings-table-https" "/opt/earnings-table" "/home/earnings" "/root/earnings-table")

for dir in "${APP_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        print_success "Found application directory: $dir"
        cd "$dir"
        echo "Contents:"
        ls -la
        break
    fi
done

if [ ! -f "package.json" ]; then
    print_error "package.json not found in any expected directory"
    print_status "Available directories:"
    ls -la /var/www/ 2>/dev/null || echo "/var/www/ not accessible"
    exit 1
fi

# Step 5: Stop existing processes
print_status "Step 5: Stopping existing processes..."
pkill -f "next" 2>/dev/null && print_success "Stopped Next.js processes" || print_warning "No Next.js processes to stop"
pkill -f "node.*earnings" 2>/dev/null && print_success "Stopped earnings processes" || print_warning "No earnings processes to stop"

# Stop systemd services if they exist
for service in "earnings-table" "earnings-app" "earnings-https"; do
    if systemctl is-active --quiet "$service" 2>/dev/null; then
        print_status "Stopping systemd service: $service"
        systemctl stop "$service"
        print_success "Stopped $service"
    fi
done

# Step 6: Check and install dependencies
print_status "Step 6: Checking dependencies..."
if ! command -v node &> /dev/null; then
    print_error "Node.js not installed"
    print_status "Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    print_success "Node.js version: $(node --version)"
fi

if ! command -v npm &> /dev/null; then
    print_error "npm not installed"
    exit 1
else
    print_success "npm version: $(npm --version)"
fi

# Step 7: Install application dependencies
print_status "Step 7: Installing application dependencies..."
npm ci --production
if [ $? -eq 0 ]; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Step 8: Generate Prisma client
print_status "Step 8: Generating Prisma client..."
if [ -f "prisma/schema.prisma" ]; then
    npx prisma generate
    if [ $? -eq 0 ]; then
        print_success "Prisma client generated"
    else
        print_warning "Prisma generation failed, continuing..."
    fi
else
    print_warning "Prisma schema not found, skipping..."
fi

# Step 9: Build the application
print_status "Step 9: Building Next.js application..."
npm run build
if [ $? -eq 0 ]; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi

# Verify build output
if [ -d ".next" ] && [ -f ".next/server/app/page.js" ]; then
    print_success "Build verification passed"
else
    print_error "Build verification failed - missing .next/server/app/page.js"
    print_status "Checking .next directory:"
    ls -la .next/ 2>/dev/null || echo ".next directory doesn't exist"
    exit 1
fi

# Step 10: Start the application
print_status "Step 10: Starting the application..."
NODE_ENV=production nohup npm start > app.log 2>&1 &
APP_PID=$!
print_success "Application started with PID: $APP_PID"

# Step 11: Wait and test application
print_status "Step 11: Testing application startup..."
sleep 15

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_success "Application is responding on port 3000!"
    
    # Test API endpoints
    if curl -f http://localhost:3000/api/earnings > /dev/null 2>&1; then
        print_success "API endpoints are working!"
    else
        print_warning "Main app works but API might have issues"
    fi
else
    print_error "Application is not responding on port 3000"
    print_status "Application logs:"
    tail -n 20 app.log 2>/dev/null || echo "No app.log found"
    
    print_status "Checking if process is still running:"
    ps aux | grep $APP_PID | grep -v grep || echo "Process not found"
    exit 1
fi

# Step 12: Check and fix Nginx configuration
print_status "Step 12: Checking Nginx configuration..."
if ! command -v nginx &> /dev/null; then
    print_status "Installing Nginx..."
    sudo apt update
    sudo apt install -y nginx
    sudo systemctl enable nginx
fi

# Check if earningstable.com site is configured
if [ -f "/etc/nginx/sites-available/earningstable.com" ]; then
    print_success "Nginx site configuration exists"
else
    print_status "Creating Nginx configuration for earningstable.com..."
    sudo tee /etc/nginx/sites-available/earningstable.com > /dev/null << 'EOF'
# earningstable.com configuration
server {
    listen 80;
    server_name earningstable.com www.earningstable.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files caching
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
EOF
    print_success "Nginx configuration created"
fi

# Enable the site
sudo ln -sf /etc/nginx/sites-available/earningstable.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
if sudo nginx -t; then
    print_success "Nginx configuration is valid"
    sudo systemctl reload nginx
    print_success "Nginx reloaded"
else
    print_error "Nginx configuration error"
    sudo nginx -t
    exit 1
fi

# Step 13: Test HTTP access
print_status "Step 13: Testing HTTP access..."
if curl -f http://89.185.250.213 > /dev/null 2>&1; then
    print_success "HTTP access working on server IP"
else
    print_warning "HTTP access not working on server IP"
fi

# Test with domain header
if curl -f -H "Host: earningstable.com" http://localhost > /dev/null 2>&1; then
    print_success "Domain routing working locally"
else
    print_warning "Domain routing not working locally"
fi

# Step 14: Check SSL/HTTPS
print_status "Step 14: Checking SSL/HTTPS configuration..."
if [ -f "/etc/letsencrypt/live/earningstable.com/fullchain.pem" ]; then
    print_success "SSL certificate found"
    
    # Check if HTTPS is configured
    if grep -q "listen 443" /etc/nginx/sites-available/earningstable.com; then
        print_success "HTTPS configuration exists"
    else
        print_warning "HTTPS not configured in Nginx"
        print_status "Run: sudo certbot --nginx -d earningstable.com -d www.earningstable.com"
    fi
else
    print_warning "No SSL certificate found"
    print_status "To set up HTTPS, run:"
    echo "sudo certbot --nginx -d earningstable.com -d www.earningstable.com"
fi

# Step 15: Final status check
print_status "Step 15: Final status check..."
echo ""
echo "🔍 Process status:"
ps aux | grep -E "(node|next)" | grep -v grep || echo "No processes found"

echo ""
echo "🌐 Port status:"
netstat -tlnp | grep -E ":(80|443|3000)" || echo "No relevant ports in use"

echo ""
echo "📋 Recent application logs:"
tail -n 10 app.log 2>/dev/null || echo "No logs available"

echo ""
echo "📋 Nginx error logs:"
sudo tail -n 5 /var/log/nginx/error.log 2>/dev/null || echo "No Nginx error logs"

echo ""
print_success "🎉 502 Bad Gateway fix completed!"
echo ""
print_status "🌐 Test URLs:"
echo "   HTTP:  http://89.185.250.213"
echo "   HTTP:  http://earningstable.com (if DNS is configured)"
echo "   HTTPS: https://earningstable.com (if SSL is configured)"
echo ""
print_status "📊 Monitor commands:"
echo "   # Application logs"
echo "   tail -f app.log"
echo ""
echo "   # Nginx logs"
echo "   sudo tail -f /var/log/nginx/access.log"
echo "   sudo tail -f /var/log/nginx/error.log"
echo ""
echo "   # Process status"
echo "   ps aux | grep node"
echo ""
print_status "🔧 If issues persist:"
echo "   1. Check DNS configuration for earningstable.com"
echo "   2. Verify SSL certificate: sudo certbot certificates"
echo "   3. Check firewall: sudo ufw status"
echo "   4. Monitor logs for specific errors"
