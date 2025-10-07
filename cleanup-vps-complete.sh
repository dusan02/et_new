#!/bin/bash

# 🧹 COMPLETE VPS CLEANUP SCRIPT
# Vymaže VŠETKO na VPS serveri

set -e

echo "🧹 Starting complete VPS cleanup..."

# Configuration
VPS_HOST="89.185.250.213"
VPS_USER="root"

echo "📋 Cleaning VPS: $VPS_USER@$VPS_HOST"
echo ""

# Complete cleanup script
ssh $VPS_USER@$VPS_HOST << 'EOF'
echo "🛑 Stopping all processes..."

# Stop PM2 processes
echo "📱 Stopping PM2 processes..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true

# Stop Docker containers
echo "🐳 Stopping Docker containers..."
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true
docker system prune -af 2>/dev/null || true

# Stop any Node.js processes
echo "🟢 Stopping Node.js processes..."
pkill -f node 2>/dev/null || true
pkill -f npm 2>/dev/null || true
pkill -f tsx 2>/dev/null || true
pkill -f next 2>/dev/null || true

# Stop any other web servers
echo "🌐 Stopping web servers..."
systemctl stop nginx 2>/dev/null || true
systemctl stop apache2 2>/dev/null || true
systemctl stop httpd 2>/dev/null || true

# Remove application directories
echo "🗑️ Removing application directories..."
rm -rf /var/www/earnings-table 2>/dev/null || true
rm -rf /var/www/html/earnings-table 2>/dev/null || true
rm -rf /opt/earnings-table 2>/dev/null || true
rm -rf /opt/et_new 2>/dev/null || true
rm -rf /home/earnings-table 2>/dev/null || true
rm -rf /root/earnings-table 2>/dev/null || true

# Remove any remaining project files
echo "📁 Removing project files..."
find /var/www -name "*earnings*" -type d -exec rm -rf {} + 2>/dev/null || true
find /opt -name "*earnings*" -type d -exec rm -rf {} + 2>/dev/null || true
find /home -name "*earnings*" -type d -exec rm -rf {} + 2>/dev/null || true
find /root -name "*earnings*" -type d -exec rm -rf {} + 2>/dev/null || true

# Remove databases
echo "🗄️ Removing databases..."
rm -rf /var/lib/sqlite3/earnings* 2>/dev/null || true
rm -rf /opt/databases/earnings* 2>/dev/null || true
rm -rf /home/databases/earnings* 2>/dev/null || true
find / -name "*earnings*.db" -delete 2>/dev/null || true
find / -name "*earnings*.sqlite" -delete 2>/dev/null || true

# Remove logs
echo "📝 Removing logs..."
rm -rf /var/log/earnings* 2>/dev/null || true
rm -rf /opt/logs/earnings* 2>/dev/null || true
find /var/log -name "*earnings*" -delete 2>/dev/null || true

# Remove any remaining Node.js modules
echo "📦 Removing Node.js modules..."
rm -rf /var/www/*/node_modules 2>/dev/null || true
rm -rf /opt/*/node_modules 2>/dev/null || true
rm -rf /home/*/node_modules 2>/dev/null || true
rm -rf /root/node_modules 2>/dev/null || true

# Remove any remaining .next directories
echo "🏗️ Removing build directories..."
rm -rf /var/www/*/.next 2>/dev/null || true
rm -rf /opt/*/.next 2>/dev/null || true
rm -rf /home/*/.next 2>/dev/null || true
rm -rf /root/.next 2>/dev/null || true

# Remove any remaining package-lock.json files
echo "🔒 Removing package files..."
rm -rf /var/www/*/package-lock.json 2>/dev/null || true
rm -rf /opt/*/package-lock.json 2>/dev/null || true
rm -rf /home/*/package-lock.json 2>/dev/null || true
rm -rf /root/package-lock.json 2>/dev/null || true

# Clean up system
echo "🧹 Cleaning up system..."
apt-get update -y 2>/dev/null || true
apt-get autoremove -y 2>/dev/null || true
apt-get autoclean -y 2>/dev/null || true

# Clear any remaining processes
echo "🔄 Final cleanup..."
sleep 3

# Check what's still running
echo "🔍 Checking remaining processes..."
ps aux | grep -E "(node|npm|tsx|next)" | grep -v grep || echo "No Node.js processes found"

# Check remaining directories
echo "📂 Checking remaining directories..."
find /var/www /opt /home /root -name "*earnings*" -type d 2>/dev/null || echo "No earnings directories found"

echo "✅ Complete VPS cleanup finished!"
echo ""
echo "📊 Cleanup summary:"
echo "- All PM2 processes stopped and deleted"
echo "- All Docker containers stopped and removed"
echo "- All Node.js processes killed"
echo "- All application directories removed"
echo "- All databases removed"
echo "- All logs removed"
echo "- All build artifacts removed"
echo "- System cleaned up"
echo ""
echo "🎯 VPS is now completely clean and ready for fresh deployment!"
EOF

echo ""
echo "✅ Complete VPS cleanup completed!"
echo ""
echo "🚀 VPS is now ready for fresh deployment!"
echo "You can now proceed with your SSH deployment."
