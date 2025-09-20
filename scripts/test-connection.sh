#!/bin/bash

# Connection Test Script for VPS (bardus)
# This script tests the connection to the server

set -e

echo "🔍 Testing Server Connection..."
echo "=================================="
echo "📅 Date: $(date)"
echo "🌐 Target: VPS (bardus) - 89.185.250.213"
echo ""

# Server details
SERVER_IP="89.185.250.213"
SERVER_USER="root"
SERVER_PASSWORD="EJXTfBOG2t"

# Function to run commands on remote server
run_remote() {
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$1"
}

echo "📦 Installing required tools locally..."
if ! command -v sshpass &> /dev/null; then
    echo "Installing sshpass..."
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        echo "Please install sshpass manually on Windows"
        exit 1
    else
        sudo apt-get update && sudo apt-get install -y sshpass
    fi
fi

echo "🌐 Testing SSH connection..."
if run_remote "echo 'SSH connection successful'"; then
    echo "✅ SSH connection successful!"
else
    echo "❌ SSH connection failed!"
    exit 1
fi

echo "📊 Checking server information..."
echo "OS Information:"
run_remote "cat /etc/os-release"

echo ""
echo "System Resources:"
run_remote "free -h"

echo ""
echo "Disk Usage:"
run_remote "df -h"

echo ""
echo "Docker Status:"
run_remote "docker --version || echo 'Docker not installed'"

echo ""
echo "Docker Compose Status:"
run_remote "docker-compose --version || echo 'Docker Compose not installed'"

echo ""
echo "Network Configuration:"
run_remote "ip addr show"

echo ""
echo "Firewall Status:"
run_remote "ufw status || iptables -L || echo 'No firewall configured'"

echo ""
echo "✅ Connection test completed!"
echo "🌐 Server is accessible and ready for deployment."
