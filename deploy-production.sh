#!/bin/bash

# Production Deployment Script for earningstable.com
# Server: 89.185.250.213:3000

echo "🚀 Starting production deployment for earningstable.com..."

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

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

print_status "Stopping existing application..."
pm2 stop earningstable || true
pm2 delete earningstable || true

print_status "Pulling latest changes from Git..."
git pull origin main

print_status "Installing dependencies..."
npm ci --production

print_status "Running pre-build validation..."
npm run build

if [ $? -ne 0 ]; then
    print_error "Build failed! Please fix the issues before deploying."
    exit 1
fi

print_status "Setting up environment variables..."
if [ ! -f ".env.production" ]; then
    print_warning ".env.production not found. Please create it with your production settings."
    cp env.production.example .env.production
    print_warning "Please edit .env.production with your actual values before continuing."
    exit 1
fi

print_status "Starting application with PM2..."
pm2 start npm --name "earningstable" -- run start

print_status "Setting up PM2 startup..."
pm2 startup
pm2 save

print_status "Running initial data fetch..."
npm run fetch

print_status "Starting cron jobs..."
pm2 start "npm run cron" --name "earningstable-cron"

print_status "Checking application health..."
sleep 5
curl -f http://localhost:3000/api/monitoring/health || print_warning "Health check failed"

print_status "✅ Production deployment completed!"
print_status "🌐 Application URL: https://earningstable.com"
print_status "📊 Health Check: http://89.185.250.213:3000/api/monitoring/health"
print_status "📈 Data will be refreshed every 30 minutes"

# Show PM2 status
pm2 status
