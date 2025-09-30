#!/bin/bash

# Production deployment script
set -e

echo "🚀 Starting production deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_error ".env.production file not found!"
    print_warning "Creating .env.production from .env.example..."
    cp .env.example .env.production
    print_warning "Please edit .env.production with your production values!"
    exit 1
fi

# Check if required environment variables are set
print_status "Checking environment variables..."
source .env.production

if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL not set in .env.production"
    exit 1
fi

if [ -z "$FINNHUB_API_KEY" ]; then
    print_error "FINNHUB_API_KEY not set in .env.production"
    exit 1
fi

if [ -z "$POLYGON_API_KEY" ]; then
    print_error "POLYGON_API_KEY not set in .env.production"
    exit 1
fi

print_status "Environment variables OK"

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose -f docker-compose.production.yml down || true

# Build and start new containers
print_status "Building and starting containers..."
docker-compose -f docker-compose.production.yml up --build -d

# Wait for application to be ready
print_status "Waiting for application to be ready..."
sleep 30

# Check if application is running
print_status "Checking application health..."
if curl -f http://localhost:3000/api/monitoring/health > /dev/null 2>&1; then
    print_status "✅ Application is running successfully!"
    print_status "🌐 Application URL: http://localhost:3000"
else
    print_error "❌ Application health check failed!"
    print_status "Checking logs..."
    docker-compose -f docker-compose.production.yml logs app
    exit 1
fi

# Run initial data fetch
print_status "Running initial data fetch..."
docker-compose -f docker-compose.production.yml exec app npm run fetch

print_status "🎉 Deployment completed successfully!"
print_status "📊 Application is running at http://localhost:3000"
print_status "📈 Data will be automatically updated every 30 minutes"
