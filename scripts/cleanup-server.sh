#!/bin/bash

# Server Cleanup Script for VPS (bardus)
# This script will clean up the existing content on the server

set -e

echo "🧹 Starting Server Cleanup..."
echo "=================================="
echo "📅 Date: $(date)"
echo "🌐 Target: VPS (bardus) - 89.185.250.213"
echo ""

# Server details
SERVER_IP="89.185.250.213"
SERVER_USER="root"
SERVER_PASSWORD="EJXTfBOG2t"

echo "⚠️  WARNING: This will clean up ALL existing content on the server!"
echo "   Server: $SERVER_IP"
echo "   User: $SERVER_USER"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cleanup cancelled."
    exit 1
fi

echo "🔧 Starting cleanup process..."

# Function to run commands on remote server
run_remote() {
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$1"
}

# Function to copy files to remote server
copy_to_remote() {
    sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no "$1" "$SERVER_USER@$SERVER_IP:$2"
}

echo "📦 Installing required tools on server..."
run_remote "apt update && apt install -y sshpass curl wget git"

echo "🛑 Stopping all running services..."
run_remote "systemctl stop nginx || true"
run_remote "systemctl stop apache2 || true"
run_remote "systemctl stop mysql || true"
run_remote "systemctl stop postgresql || true"
run_remote "docker-compose down || true"
run_remote "docker stop \$(docker ps -aq) || true"
run_remote "docker rm \$(docker ps -aq) || true"

echo "🗑️  Removing existing project directories..."
run_remote "rm -rf /opt/earnings-table || true"
run_remote "rm -rf /var/www/html/* || true"
run_remote "rm -rf /home/*/public_html/* || true"

echo "🐳 Cleaning up Docker..."
run_remote "docker system prune -af || true"
run_remote "docker volume prune -f || true"
run_remote "docker network prune -f || true"

echo "📁 Cleaning up system directories..."
run_remote "rm -rf /tmp/* || true"
run_remote "rm -rf /var/tmp/* || true"
run_remote "rm -rf /var/log/*.log || true"

echo "🔧 Installing Docker and Docker Compose..."
run_remote "curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh"
run_remote "curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
run_remote "chmod +x /usr/local/bin/docker-compose"

echo "📁 Creating project directory..."
run_remote "mkdir -p /opt/earnings-table"
run_remote "chmod 755 /opt/earnings-table"

echo "✅ Server cleanup completed!"
echo ""
echo "📋 Server is now ready for deployment."
echo "🌐 Server IP: $SERVER_IP"
echo "📁 Project directory: /opt/earnings-table"
echo ""
echo "🔧 Next steps:"
echo "   1. Run the deployment script"
echo "   2. Configure environment variables"
echo "   3. Start the application"
