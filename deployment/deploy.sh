#!/bin/bash

# Production Deployment Script for VPS (mydreams.cz)
# Run this script on your Debian VPS

set -e

echo "🚀 Starting Production Deployment..."
echo "=================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then
  echo "❌ Please don't run as root. Use a regular user with sudo access."
  exit 1
fi

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
  echo "🐳 Installing Docker..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo usermod -aG docker $USER
  rm get-docker.sh
fi

# Install Docker Compose if not installed
if ! command -v docker-compose &> /dev/null; then
  echo "🐳 Installing Docker Compose..."
  sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
fi

# Create project directory
PROJECT_DIR="/opt/earnings-table"
echo "📁 Creating project directory: $PROJECT_DIR"
sudo mkdir -p $PROJECT_DIR
sudo chown $USER:$USER $PROJECT_DIR

# Copy project files
echo "📋 Copying project files..."
cp -r . $PROJECT_DIR/
cd $PROJECT_DIR

# Create production environment file
echo "⚙️ Creating production environment file..."
cat > .env << EOF
# Production Environment Variables
DATABASE_URL="postgresql://earnings_user:earnings_password@postgres:5432/earnings_table"
REDIS_URL="redis://redis:6379"
NODE_ENV="production"

# API Keys - REPLACE WITH YOUR ACTUAL KEYS
FINNHUB_API_KEY="your_finnhub_api_key_here"
POLYGON_API_KEY="your_polygon_api_key_here"

# Next.js
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
EOF

echo "⚠️  IMPORTANT: Edit .env file and add your actual API keys!"
echo "   nano .env"

# Build and start services
echo "🔨 Building and starting services..."
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service status
echo "📊 Checking service status..."
docker-compose ps

# Show logs
echo "📋 Recent logs:"
docker-compose logs --tail=50

echo ""
echo "✅ Deployment completed!"
echo "🌐 Your application should be available at: http://your-vps-ip:3000"
echo ""
echo "📋 Useful commands:"
echo "   docker-compose logs -f app          # View app logs"
echo "   docker-compose logs -f cron-worker  # View cron logs"
echo "   docker-compose restart app          # Restart app"
echo "   docker-compose restart cron-worker  # Restart cron"
echo "   docker-compose down                 # Stop all services"
echo "   docker-compose up -d                # Start all services"
echo ""
echo "🔧 To update the application:"
echo "   1. Copy new files to $PROJECT_DIR"
echo "   2. Run: docker-compose build --no-cache"
echo "   3. Run: docker-compose up -d"
