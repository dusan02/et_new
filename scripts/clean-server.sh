#!/bin/bash

# Clean Server Script - Removes old project and prepares for fresh migration
# Usage: ./scripts/clean-server.sh

set -e

echo "🧹 Cleaning server for fresh migration..."

# Server details
SERVER="89.185.250.213"
USER="root"
PROJECT_DIR="/opt/earnings-table"

# Function to run commands on server
run_remote() {
    ssh $USER@$SERVER "$1"
}

echo "📋 Step 1: Stopping all containers..."
run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml down || true"

echo "📋 Step 2: Removing old containers and images..."
run_remote "cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.yml rm -f || true"
run_remote "docker system prune -f || true"

echo "📋 Step 3: Removing old project directory..."
run_remote "rm -rf $PROJECT_DIR || true"

echo "📋 Step 4: Creating fresh project directory..."
run_remote "mkdir -p $PROJECT_DIR"

echo "✅ Server cleaned successfully!"
echo "🚀 Ready for fresh migration"
