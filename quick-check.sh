#!/bin/bash

# 🚀 QUICK APPLICATION CHECK - SSH Commands
# Najdôležitejšie príkazy na rýchlu kontrolu

echo "⚡ QUICK APP STATUS CHECK"
echo "========================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. SSH Connection
echo "🔐 SSH Connection:"
echo "ssh root@89.185.250.213"
echo "cd /var/www/earnings-table"
echo ""

# 2. PM2 Status (MOST IMPORTANT)
echo "⚙️ PM2 Status:"
echo "pm2 status"
echo ""

# 3. Health Check
echo "🏥 Health Check:"
echo "curl -f http://localhost:3000/api/monitoring/health"
echo ""

# 4. Recent Logs
echo "📋 Recent Logs:"
echo "pm2 logs --lines 10"
echo ""

# 5. System Resources
echo "💻 System Resources:"
echo "free -h && df -h / && uptime"
echo ""

# 6. Port Check
echo "🌐 Port Check:"
echo "netstat -tlnp | grep :3000"
echo ""

# 7. Quick Restart
echo "🔄 Quick Restart:"
echo "pm2 restart all"
echo ""

# 8. Emergency Logs
echo "🚨 Emergency Logs:"
echo "pm2 logs --err --lines 20"
echo ""

echo "========================="
echo "✅ SUCCESS = PM2 online + HTTP 200"
echo "❌ FAILURE = PM2 offline OR HTTP error"
echo "========================="
