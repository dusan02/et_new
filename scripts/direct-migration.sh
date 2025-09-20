#!/bin/bash

# Direct Migration Script - No sshpass needed
# This script uses direct SSH commands

set -e

echo "🚀 Direct Migration to VPS (bardus)"
echo "=================================="
echo "📅 Date: $(date)"
echo "🌐 Target: 89.185.250.213"
echo ""

# Server details
SERVER_IP="89.185.250.213"
SERVER_USER="root"
PROJECT_DIR="/opt/earnings-table"

echo "⚠️  This will clean up the server and deploy your project"
echo "   Server: $SERVER_IP"
echo "   User: $SERVER_USER"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Migration cancelled."
    exit 1
fi

echo "🧹 Step 1: Cleaning up server..."
echo "Please enter the server password when prompted:"

# Clean up server
ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'EOF'
echo "🛑 Stopping all services..."
systemctl stop nginx || true
systemctl stop apache2 || true
systemctl stop mysql || true
systemctl stop postgresql || true
docker-compose down || true
docker stop $(docker ps -aq) || true
docker rm $(docker ps -aq) || true

echo "🗑️  Removing existing project directories..."
rm -rf /opt/earnings-table || true
rm -rf /var/www/html/* || true
rm -rf /home/*/public_html/* || true

echo "🐳 Cleaning up Docker..."
docker system prune -af || true
docker volume prune -f || true
docker network prune -f || true

echo "📁 Cleaning up system directories..."
rm -rf /tmp/* || true
rm -rf /var/tmp/* || true
rm -rf /var/log/*.log || true

echo "🔧 Installing Docker and Docker Compose..."
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

echo "📁 Creating project directory..."
mkdir -p /opt/earnings-table
chmod 755 /opt/earnings-table

echo "✅ Server cleanup completed!"
EOF

echo ""
echo "📋 Step 2: Copying project files..."
echo "Please enter the server password when prompted:"

# Create temporary directory for deployment
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

# Copy files to server
scp -o StrictHostKeyChecking=no -r "$TEMP_DIR/earnings-table" "$SERVER_USER@$SERVER_IP:$PROJECT_DIR"

echo ""
echo "⚙️ Step 3: Setting up production environment..."
echo "Please enter the server password when prompted:"

# Setup production environment
ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << EOF
cd $PROJECT_DIR

echo "📋 Setting up production Prisma schema..."
cp prisma/schema.prod.prisma prisma/schema.prisma

echo "⚙️ Creating production environment file..."
cat > .env << 'ENVEOF'
# Production Environment Variables
DATABASE_URL="postgresql://earnings_user:earnings_password@postgres:5432/earnings_table"
REDIS_URL="redis://redis:6379"
NODE_ENV="production"

# API Keys - REPLACE WITH YOUR ACTUAL KEYS
FINNHUB_API_KEY="your_finnhub_api_key_here"
POLYGON_API_KEY="your_polygon_api_key_here"

# Next.js
NEXTAUTH_URL="http://$SERVER_IP:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Application
NEXT_PUBLIC_APP_URL="http://$SERVER_IP:3000"
CRON_ENABLED="true"
CRON_TIMEZONE="America/New_York"
ENVEOF

echo "🔨 Building and starting services..."
docker-compose down --remove-orphans || true
docker-compose build --no-cache
docker-compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 30

echo "📊 Checking service status..."
docker-compose ps

echo "📋 Recent logs:"
docker-compose logs --tail=20

echo "🏥 Testing health check..."
sleep 10
if curl -f http://localhost:3000/api/earnings > /dev/null 2>&1; then
    echo "✅ Application is healthy!"
else
    echo "❌ Application health check failed!"
    echo "📋 Checking logs..."
    docker-compose logs --tail=50
fi
EOF

# Clean up temporary directory
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Migration completed!"
echo "🌐 Your application is available at: http://$SERVER_IP:3000"
echo ""
echo "⚠️  IMPORTANT: Edit the .env file and add your actual API keys!"
echo "   ssh $SERVER_USER@$SERVER_IP"
echo "   cd $PROJECT_DIR"
echo "   nano .env"
echo ""
echo "🔧 Useful commands:"
echo "   ssh $SERVER_USER@$SERVER_IP"
echo "   cd $PROJECT_DIR"
echo "   docker-compose logs -f"
echo "   docker-compose restart"
