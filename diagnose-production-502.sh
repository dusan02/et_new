#!/bin/bash

# Quick Production 502 Bad Gateway Diagnostic Script
# For earningstable.com on server 89.185.250.213
# This script only checks status, doesn't make changes

echo "🔍 Diagnosing 502 Bad Gateway Error on earningstable.com"
echo "======================================================"
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

# Check 1: Server environment
print_status "1. Server Environment Check"
echo "Current user: $(whoami)"
echo "Current directory: $(pwd)"
echo "Server IP: $(curl -s ifconfig.me 2>/dev/null || echo 'Unknown')"
echo "Uptime: $(uptime)"
echo ""

# Check 2: Running processes
print_status "2. Process Check"
echo "Node.js processes:"
ps aux | grep -E "(node|next)" | grep -v grep || echo "❌ No Node.js processes found"
echo ""

echo "Nginx processes:"
ps aux | grep nginx | grep -v grep || echo "❌ No Nginx processes found"
echo ""

# Check 3: Port usage
print_status "3. Port Usage Check"
echo "Port 80 (HTTP):"
netstat -tlnp | grep :80 || echo "❌ Port 80 not in use"
echo ""

echo "Port 443 (HTTPS):"
netstat -tlnp | grep :443 || echo "❌ Port 443 not in use"
echo ""

echo "Port 3000 (App):"
netstat -tlnp | grep :3000 || echo "❌ Port 3000 not in use"
echo ""

# Check 4: Application directory
print_status "4. Application Directory Check"
APP_DIRS=("/var/www/earnings-table" "/var/www/earnings-table-https" "/opt/earnings-table" "/home/earnings" "/root/earnings-table")

for dir in "${APP_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        print_success "Found: $dir"
        echo "Contents:"
        ls -la "$dir" | head -10
        echo ""
        
        if [ -f "$dir/package.json" ]; then
            print_success "package.json found"
        else
            print_error "package.json not found"
        fi
        
        if [ -d "$dir/.next" ]; then
            print_success ".next directory exists"
        else
            print_error ".next directory missing (app not built)"
        fi
        
        if [ -f "$dir/app.log" ]; then
            print_success "app.log exists"
            echo "Last 5 lines of app.log:"
            tail -n 5 "$dir/app.log"
        else
            print_warning "app.log not found"
        fi
        break
    fi
done
echo ""

# Check 5: Nginx configuration
print_status "5. Nginx Configuration Check"
if command -v nginx &> /dev/null; then
    print_success "Nginx is installed"
    
    if [ -f "/etc/nginx/sites-available/earningstable.com" ]; then
        print_success "earningstable.com site configuration exists"
        echo "Configuration preview:"
        head -n 20 /etc/nginx/sites-available/earningstable.com
    else
        print_error "earningstable.com site configuration missing"
    fi
    
    if [ -L "/etc/nginx/sites-enabled/earningstable.com" ]; then
        print_success "earningstable.com site is enabled"
    else
        print_error "earningstable.com site is not enabled"
    fi
    
    echo ""
    echo "Nginx configuration test:"
    sudo nginx -t 2>&1 || print_error "Nginx configuration has errors"
    
else
    print_error "Nginx is not installed"
fi
echo ""

# Check 6: SSL/HTTPS
print_status "6. SSL/HTTPS Check"
if [ -f "/etc/letsencrypt/live/earningstable.com/fullchain.pem" ]; then
    print_success "SSL certificate exists"
    echo "Certificate info:"
    sudo openssl x509 -in /etc/letsencrypt/live/earningstable.com/fullchain.pem -text -noout | grep -E "(Subject:|Not Before:|Not After:)"
else
    print_warning "No SSL certificate found"
fi

if grep -q "listen 443" /etc/nginx/sites-available/earningstable.com 2>/dev/null; then
    print_success "HTTPS configuration exists in Nginx"
else
    print_warning "HTTPS not configured in Nginx"
fi
echo ""

# Check 7: Application connectivity
print_status "7. Application Connectivity Check"
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_success "Application responds on localhost:3000"
    
    # Test API
    if curl -f http://localhost:3000/api/earnings > /dev/null 2>&1; then
        print_success "API endpoints are working"
    else
        print_warning "API endpoints not responding"
    fi
else
    print_error "Application not responding on localhost:3000"
fi

# Test with domain header
if curl -f -H "Host: earningstable.com" http://localhost > /dev/null 2>&1; then
    print_success "Domain routing works locally"
else
    print_warning "Domain routing not working locally"
fi
echo ""

# Check 8: External connectivity
print_status "8. External Connectivity Check"
if curl -f http://89.185.250.213 > /dev/null 2>&1; then
    print_success "Server responds on HTTP (IP)"
else
    print_error "Server not responding on HTTP (IP)"
fi

if curl -f https://89.185.250.213 > /dev/null 2>&1; then
    print_success "Server responds on HTTPS (IP)"
else
    print_warning "Server not responding on HTTPS (IP)"
fi

# Test domain (if DNS is configured)
if curl -f http://earningstable.com > /dev/null 2>&1; then
    print_success "Domain responds on HTTP"
else
    print_warning "Domain not responding on HTTP (check DNS)"
fi

if curl -f https://earningstable.com > /dev/null 2>&1; then
    print_success "Domain responds on HTTPS"
else
    print_warning "Domain not responding on HTTPS"
fi
echo ""

# Check 9: Recent logs
print_status "9. Recent Logs Check"
echo "Nginx access log (last 5 lines):"
sudo tail -n 5 /var/log/nginx/access.log 2>/dev/null || echo "No access log found"
echo ""

echo "Nginx error log (last 5 lines):"
sudo tail -n 5 /var/log/nginx/error.log 2>/dev/null || echo "No error log found"
echo ""

echo "System log (last 5 lines):"
sudo tail -n 5 /var/log/syslog 2>/dev/null | grep -E "(nginx|node)" || echo "No relevant system logs"
echo ""

# Check 10: DNS
print_status "10. DNS Check"
echo "DNS resolution for earningstable.com:"
nslookup earningstable.com 2>/dev/null || echo "DNS resolution failed"
echo ""

echo "DNS resolution for www.earningstable.com:"
nslookup www.earningstable.com 2>/dev/null || echo "DNS resolution failed"
echo ""

# Summary
print_status "🔍 DIAGNOSTIC SUMMARY"
echo "========================"
echo ""

# Count issues
ISSUES=0

if ! ps aux | grep -E "(node|next)" | grep -v grep > /dev/null; then
    echo "❌ ISSUE: No Node.js application running"
    ISSUES=$((ISSUES + 1))
fi

if ! netstat -tlnp | grep :3000 > /dev/null; then
    echo "❌ ISSUE: Application not listening on port 3000"
    ISSUES=$((ISSUES + 1))
fi

if ! curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "❌ ISSUE: Application not responding locally"
    ISSUES=$((ISSUES + 1))
fi

if ! ps aux | grep nginx | grep -v grep > /dev/null; then
    echo "❌ ISSUE: Nginx not running"
    ISSUES=$((ISSUES + 1))
fi

if ! netstat -tlnp | grep :80 > /dev/null; then
    echo "❌ ISSUE: Nginx not listening on port 80"
    ISSUES=$((ISSUES + 1))
fi

if [ ! -f "/etc/nginx/sites-available/earningstable.com" ]; then
    echo "❌ ISSUE: Nginx site configuration missing"
    ISSUES=$((ISSUES + 1))
fi

if [ $ISSUES -eq 0 ]; then
    print_success "🎉 No major issues found! The 502 error might be temporary."
    echo ""
    print_status "Possible causes:"
    echo "1. DNS propagation issues"
    echo "2. SSL certificate problems"
    echo "3. Temporary network issues"
    echo "4. Application startup time"
else
    print_error "Found $ISSUES major issues that need to be fixed."
    echo ""
    print_status "Recommended action:"
    echo "Run the fix script: bash fix-production-502-error.sh"
fi

echo ""
print_status "📋 Next Steps:"
echo "1. If issues found: Run 'bash fix-production-502-error.sh'"
echo "2. Monitor logs: 'tail -f app.log' and 'sudo tail -f /var/log/nginx/error.log'"
echo "3. Test connectivity: 'curl -I http://earningstable.com'"
echo "4. Check DNS: 'nslookup earningstable.com'"
echo ""
