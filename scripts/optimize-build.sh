#!/bin/bash

# Build Optimization Script
# Usage: ./scripts/optimize-build.sh

set -e

echo "🚀 Starting build optimization..."

# Step 1: Clean previous builds
echo "📋 Step 1: Cleaning previous builds..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .next/cache

# Step 2: Install dependencies with optimizations
echo "📋 Step 2: Installing dependencies..."
npm ci --only=production

# Step 3: Generate Prisma client
echo "📋 Step 3: Generating Prisma client..."
npx prisma generate

# Step 4: Build with optimizations
echo "📋 Step 4: Building application..."
ANALYZE=true npm run build

# Step 5: Show build size
echo "📋 Step 5: Build size analysis..."
echo "Build completed! Check the bundle analyzer report."

# Step 6: Show Docker image size (if built)
if [ -f "Dockerfile.optimized" ]; then
    echo "📋 Step 6: Building optimized Docker image..."
    docker build -f Dockerfile.optimized -t earnings-table-optimized .
    
    echo "📊 Docker image sizes:"
    docker images | grep earnings-table
fi

echo "✅ Build optimization completed!"
