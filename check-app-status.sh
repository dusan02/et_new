#!/bin/bash

# 🔍 COMPLETE APPLICATION STATUS CHECK
# Pre SSH kontrolu aplikácie na serveri 89.185.250.213

echo "🚀 EARNINGS TABLE - APPLICATION STATUS CHECK"
echo "============================================="
echo "Server: 89.185.250.213"
echo "App Directory: /var/www/earnings-table"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# 1. SSH CONNECTION CHECK
echo "🔐 1. SSH CONNECTION & SERVER STATUS"
echo "------------------------------------"
print_info "Pripojenie na server: ssh root@89.185.250.213"
print_info "Navigácia do app: cd /var/www/earnings-table"
echo ""

# 2. PM2 PROCESS STATUS
echo "⚙️ 2. PM2 PROCESS STATUS"
echo "------------------------"
echo "pm2 status"
echo "pm2 list"
echo "pm2 monit"
echo ""

# 3. APPLICATION HEALTH CHECKS
echo "🏥 3. APPLICATION HEALTH CHECKS"
echo "-------------------------------"
echo "# Health check endpoint"
echo "curl -f http://localhost:3000/api/monitoring/health"
echo ""
echo "# Main API endpoints"
echo "curl -s http://localhost:3000/api/earnings | head -c 200"
echo "curl -s http://localhost:3000/api/earnings/stats | head -c 200"
echo ""

# 4. LOG MONITORING
echo "📋 4. LOG MONITORING"
echo "--------------------"
echo "# Recent logs (last 20 lines)"
echo "pm2 logs earnings-table --lines 20"
echo "pm2 logs earnings-cron --lines 20"
echo ""
echo "# Real-time log monitoring"
echo "pm2 logs --follow"
echo ""

# 5. SYSTEM RESOURCES
echo "💻 5. SYSTEM RESOURCES"
echo "----------------------"
echo "# Memory usage"
echo "free -h"
echo ""
echo "# Disk usage"
echo "df -h"
echo ""
echo "# CPU load"
echo "uptime"
echo "htop"
echo ""

# 6. NETWORK & PORTS
echo "🌐 6. NETWORK & PORTS"
echo "---------------------"
echo "# Check if port 3000 is listening"
echo "netstat -tlnp | grep :3000"
echo "ss -tlnp | grep :3000"
echo ""
echo "# Check nginx status"
echo "systemctl status nginx"
echo "nginx -t"
echo ""

# 7. DATABASE STATUS
echo "🗄️ 7. DATABASE STATUS"
echo "---------------------"
echo "# Check database file"
echo "ls -la prisma/"
echo "ls -la prisma/dev.db"
echo ""
echo "# Database size"
echo "du -h prisma/dev.db"
echo ""

# 8. CRON JOBS VERIFICATION
echo "⏰ 8. CRON JOBS VERIFICATION"
echo "----------------------------"
echo "# Check cron worker logs"
echo "tail -f logs/cron-combined.log"
echo ""
echo "# Check if cron is running"
echo "ps aux | grep worker-new.js"
echo ""

# 9. APPLICATION URLS TEST
echo "🔗 9. APPLICATION URLS TEST"
echo "---------------------------"
echo "# Test production URLs"
echo "curl -I https://earningstable.com"
echo "curl -I http://89.185.250.213:3000"
echo ""

# 10. QUICK RESTART COMMANDS
echo "🔄 10. QUICK RESTART COMMANDS"
echo "-----------------------------"
echo "# Restart all processes"
echo "pm2 restart all"
echo ""
echo "# Restart specific process"
echo "pm2 restart earnings-table"
echo "pm2 restart earnings-cron"
echo ""
echo "# Stop and start"
echo "pm2 stop all && pm2 start ecosystem.config.js"
echo ""

# 11. EMERGENCY COMMANDS
echo "🚨 11. EMERGENCY COMMANDS"
echo "-------------------------"
echo "# If something is wrong"
echo "pm2 logs --err"
echo "pm2 flush"
echo "pm2 reload all"
echo ""
echo "# Check environment"
echo "cat .env.local"
echo ""

# 12. DEPLOYMENT VERIFICATION
echo "🚀 12. DEPLOYMENT VERIFICATION"
echo "------------------------------"
echo "# Check git status"
echo "git status"
echo "git log --oneline -5"
echo ""
echo "# Check package versions"
echo "npm list --depth=0"
echo ""

echo "============================================="
echo "📊 QUICK STATUS SUMMARY COMMANDS:"
echo "============================================="
echo ""
echo "# One-liner status check"
echo "pm2 status && curl -f http://localhost:3000/api/monitoring/health && echo '✅ App OK' || echo '❌ App DOWN'"
echo ""
echo "# Resource check"
echo "free -h && df -h / && uptime"
echo ""
echo "# Log check"
echo "pm2 logs --lines 10"
echo ""
echo "============================================="
echo "🎯 SUCCESS INDICATORS:"
echo "============================================="
echo "✅ PM2 processes: earnings-table (online), earnings-cron (online)"
echo "✅ HTTP 200: https://earningstable.com"
echo "✅ API endpoints responding"
echo "✅ No error logs in PM2"
echo "✅ Cron jobs executing"
echo "✅ Database file exists and has recent data"
echo ""

echo "📞 If issues found, run these diagnostic commands:"
echo "pm2 logs --err --lines 50"
echo "systemctl status nginx"
echo "journalctl -u nginx -n 20"
echo "curl -v http://localhost:3000/api/monitoring/health"
