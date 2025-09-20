#!/bin/bash

# Production Deployment Script for VPS (bardus)
# This script deploys the earnings table application to production

set -e

echo "🚀 Starting Production Deployment..."
echo "=================================="
echo "📅 Date: $(date)"
echo "🌐 Target: VPS (bardus) - 89.185.250.213"
echo ""

# Server details
SERVER_IP="89.185.250.213"
SERVER_USER="root"
SERVER_PASSWORD="EJXTfBOG2t"
PROJECT_DIR="/opt/earnings-table"

# Function to run commands on remote server
run_remote() {
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$1"
}

# Function to copy files to remote server
copy_to_remote() {
    sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no -r "$1" "$SERVER_USER@$SERVER_IP:$2"
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

echo "📁 Preparing project files..."
# Create a temporary directory for deployment
TEMP_DIR=$(mktemp -d)
cp -r . "$TEMP_DIR/earnings-table"

# Remove unnecessary files
cd "$TEMP_DIR/earnings-table"
rm -rf node_modules
rm -rf .git
rm -rf .next
rm -rf prisma/dev.db
rm -rf prisma/test.db
rm -rf logs
rm -rf .env.local
rm -rf .env

echo "📋 Copying project files to server..."
copy_to_remote "$TEMP_DIR/earnings-table" "$PROJECT_DIR"

echo "⚙️ Creating production environment file..."
run_remote "cat > $PROJECT_DIR/.env << 'EOF'
# Production Environment Variables
DATABASE_URL=\"postgresql://earnings_user:earnings_password@postgres:5432/earnings_table\"
REDIS_URL=\"redis://redis:6379\"
NODE_ENV=\"production\"

# API Keys - REPLACE WITH YOUR ACTUAL KEYS
FINNHUB_API_KEY=\"your_finnhub_api_key_here\"
POLYGON_API_KEY=\"your_polygon_api_key_here\"

# Next.js
NEXTAUTH_URL=\"http://$SERVER_IP:3000\"
NEXTAUTH_SECRET=\"$(openssl rand -base64 32)\"

# Application
NEXT_PUBLIC_APP_URL=\"http://$SERVER_IP:3000\"
CRON_ENABLED=\"true\"
CRON_TIMEZONE=\"America/New_York\"
EOF"

echo "📋 Setting up production Prisma schema..."
run_remote "cd $PROJECT_DIR && cp prisma/schema.prod.prisma prisma/schema.prisma"

echo "🔨 Building and starting services..."
run_remote "cd $PROJECT_DIR && docker-compose down --remove-orphans || true"
run_remote "cd $PROJECT_DIR && docker-compose build --no-cache"
run_remote "cd $PROJECT_DIR && docker-compose up -d"

echo "⏳ Waiting for services to be ready..."
sleep 30

echo "📊 Checking service status..."
run_remote "cd $PROJECT_DIR && docker-compose ps"

echo "📋 Recent logs:"
run_remote "cd $PROJECT_DIR && docker-compose logs --tail=20"

echo "🏥 Testing health check..."
sleep 10
if run_remote "curl -f http://localhost:3000/api/earnings > /dev/null 2>&1"; then
    echo "✅ Application is healthy!"
else
    echo "❌ Application health check failed!"
    echo "📋 Checking logs..."
    run_remote "cd $PROJECT_DIR && docker-compose logs --tail=50"
fi

# Clean up temporary directory
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Deployment completed!"
echo "🌐 Your application is available at: http://$SERVER_IP:3000"
echo ""
echo "📋 Useful commands:"
echo "   ssh $SERVER_USER@$SERVER_IP"
echo "   cd $PROJECT_DIR"
echo "   docker-compose logs -f app          # View app logs"
echo "   docker-compose logs -f cron-worker  # View cron logs"
echo "   docker-compose restart app          # Restart app"
echo "   docker-compose restart cron-worker  # Restart cron"
echo "   docker-compose down                 # Stop all services"
echo "   docker-compose up -d                # Start all services"
echo ""
echo "⚠️  IMPORTANT: Edit the .env file and add your actual API keys!"
echo "   ssh $SERVER_USER@$SERVER_IP"
echo "   nano $PROJECT_DIR/.env"
echo ""
echo "🔧 To update the application:"
echo "   1. Run this script again"
echo "   2. Or manually copy files and run docker-compose commands"
echo ""
echo "📊 To monitor the application:"
echo "   curl http://$SERVER_IP:3000/api/earnings"
echo "   ssh $SERVER_USER@$SERVER_IP 'cd $PROJECT_DIR && docker-compose exec app node src/workers/health-check.js'"
