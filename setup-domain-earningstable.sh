#!/bin/bash

# Setup earningstable.com domain on server 89.185.250.213
# Complete HTTPS domain configuration script

echo "🌐 Setting up earningstable.com domain"
echo "====================================="
echo "Server: 89.185.250.213"
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

# 1. Check if we're on the right server
print_status "Checking server environment..."
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "Unknown")
echo "Current server IP: $PUBLIC_IP"
echo "Expected IP: 89.185.250.213"

if [ "$PUBLIC_IP" != "89.185.250.213" ]; then
    print_warning "IP mismatch - make sure you're on the right server"
fi

# 2. Install Nginx if not installed
print_status "Checking Nginx installation..."
if ! command -v nginx &> /dev/null; then
    print_status "Installing Nginx..."
    apt update
    apt install -y nginx
    systemctl enable nginx
    print_success "Nginx installed"
else
    print_success "Nginx already installed"
fi

# 3. Install Certbot for SSL
print_status "Installing Certbot for SSL..."
if ! command -v certbot &> /dev/null; then
    apt install -y certbot python3-certbot-nginx
    print_success "Certbot installed"
else
    print_success "Certbot already installed"
fi

# 4. Create Nginx configuration for earningstable.com
print_status "Creating Nginx configuration..."
cat > /etc/nginx/sites-available/earningstable.com << 'EOF'
# earningstable.com configuration
server {
    listen 80;
    server_name earningstable.com www.earningstable.com;
    
    # Redirect HTTP to HTTPS (will be added after SSL setup)
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
        
        # CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range";
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Cache API responses
        add_header Cache-Control "public, max-age=60";
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
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
EOF

# 5. Enable the site
print_status "Enabling Nginx site..."
ln -sf /etc/nginx/sites-available/earningstable.com /etc/nginx/sites-enabled/
nginx -t

if [ $? -eq 0 ]; then
    systemctl reload nginx
    print_success "Nginx configuration active"
else
    print_error "Nginx configuration error"
    nginx -t
    exit 1
fi

# 6. Check if application is running
print_status "Checking application status..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_success "Application is running on port 3000"
else
    print_error "Application is not running on port 3000"
    print_status "Starting application..."
    cd /var/www/earnings-table
    NODE_ENV=production nohup npm start > domain-app.log 2>&1 &
    sleep 5
    
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_success "Application started successfully"
    else
        print_error "Failed to start application"
        tail -n 20 domain-app.log
        exit 1
    fi
fi

# 7. Test HTTP access
print_status "Testing HTTP access..."
if curl -f http://89.185.250.213 > /dev/null 2>&1; then
    print_success "HTTP access working"
else
    print_warning "HTTP access not working yet"
fi

echo ""
print_success "🎉 Basic domain setup completed!"
echo ""
print_status "📋 Next steps:"
echo "1. Configure DNS for earningstable.com to point to 89.185.250.213"
echo "2. Wait for DNS propagation (can take up to 24 hours)"
echo "3. Run SSL setup once DNS is working"
echo ""
print_status "🌐 DNS Configuration needed:"
echo "   Type: A Record"
echo "   Name: earningstable.com"
echo "   Value: 89.185.250.213"
echo "   TTL: 300 (5 minutes)"
echo ""
echo "   Type: A Record"
echo "   Name: www.earningstable.com"
echo "   Value: 89.185.250.213"
echo "   TTL: 300 (5 minutes)"
echo ""
print_status "🔒 SSL Setup (run after DNS is working):"
echo "   sudo certbot --nginx -d earningstable.com -d www.earningstable.com"
echo ""
print_status "🧪 Test commands:"
echo "   # Test local access"
echo "   curl -H 'Host: earningstable.com' http://localhost"
echo ""
echo "   # Test domain (after DNS setup)"
echo "   curl http://earningstable.com"
echo "   curl https://earningstable.com"
echo ""
print_status "📊 Monitor:"
echo "   # Check Nginx logs"
echo "   tail -f /var/log/nginx/access.log"
echo "   tail -f /var/log/nginx/error.log"
echo ""
echo "   # Check application"
echo "   ps aux | grep node"
echo "   curl http://localhost:3000/api/earnings/stats"
