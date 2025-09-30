#!/bin/bash

# Production Deployment Script for EarningsTable
# Usage: ./deploy-production.sh [server_ip]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP=${1:-"89.185.250.213"}
APP_NAME="earnings-table"
DOCKER_IMAGE="earnings-table:latest"
CONTAINER_NAME="earnings-app"
CRON_CONTAINER_NAME="earnings-cron"

echo -e "${BLUE}🚀 Starting production deployment to ${SERVER_IP}${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Build Docker image
echo -e "${YELLOW}📦 Building Docker image...${NC}"
docker build -f Dockerfile.production -t ${DOCKER_IMAGE} .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker image built successfully${NC}"

# Save image to tar file
echo -e "${YELLOW}💾 Saving Docker image...${NC}"
docker save ${DOCKER_IMAGE} | gzip > ${APP_NAME}-image.tar.gz

# Copy files to server
echo -e "${YELLOW}📤 Copying files to server...${NC}"
scp ${APP_NAME}-image.tar.gz root@${SERVER_IP}:/tmp/
scp docker-compose.production.yml root@${SERVER_IP}:/tmp/
scp production.env root@${SERVER_IP}:/tmp/.env.production

# Deploy on server
echo -e "${YELLOW}🚀 Deploying on server...${NC}"
ssh root@${SERVER_IP} << EOF
    set -e
    
    echo "📥 Loading Docker image..."
    docker load < /tmp/${APP_NAME}-image.tar.gz
    
    echo "🛑 Stopping existing containers..."
    docker stop ${CONTAINER_NAME} ${CRON_CONTAINER_NAME} 2>/dev/null || true
    docker rm ${CONTAINER_NAME} ${CRON_CONTAINER_NAME} 2>/dev/null || true
    
    echo "📁 Setting up directories..."
    mkdir -p /opt/${APP_NAME}
    cd /opt/${APP_NAME}
    
    echo "📋 Copying configuration files..."
    cp /tmp/docker-compose.production.yml ./docker-compose.yml
    cp /tmp/.env.production ./.env.production
    
    echo "🔧 Setting environment variables..."
    export DATABASE_URL="postgresql://earnings_user:earnings_password@localhost:5432/earnings_table"
    export FINNHUB_API_KEY="d28f1dhr01qjsuf342ogd28f1dhr01qjsuf342p0"
    export POLYGON_API_KEY="Vi_pMLcusE8RA_SUvkPAmiyziVzlmOoX"
    
    echo "🚀 Starting containers..."
    docker-compose up -d
    
    echo "⏳ Waiting for application to start..."
    sleep 10
    
    echo "🔍 Checking application health..."
    curl -f http://localhost:3000/api/monitoring/health || echo "Health check failed, but continuing..."
    
    echo "🧹 Cleaning up..."
    rm -f /tmp/${APP_NAME}-image.tar.gz
    rm -f /tmp/docker-compose.production.yml
    rm -f /tmp/.env.production
    
    echo "✅ Deployment completed!"
    echo "🌐 Application should be available at:"
    echo "   - http://${SERVER_IP}:3000"
    echo "   - https://earningstable.com"
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${BLUE}🌐 Application URLs:${NC}"
    echo -e "   - http://${SERVER_IP}:3000"
    echo -e "   - https://earningstable.com"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

# Clean up local files
rm -f ${APP_NAME}-image.tar.gz

echo -e "${GREEN}✨ All done!${NC}"