@echo off
echo 🚀 Starting build optimization...
echo ==================================

echo 📋 Step 1: Cleaning previous builds...
if exist .next rmdir /s /q .next
if exist node_modules\.cache rmdir /s /q node_modules\.cache
if exist .next\cache rmdir /s /q .next\cache

echo 📋 Step 2: Installing dependencies...
npm ci --only=production

echo 📋 Step 3: Generating Prisma client...
npx prisma generate

echo 📋 Step 4: Building application...
set ANALYZE=true
npm run build

echo 📋 Step 5: Build size analysis...
echo Build completed! Check the bundle analyzer report.

echo 📋 Step 6: Building optimized Docker image...
if exist Dockerfile.optimized (
    docker build -f Dockerfile.optimized -t earnings-table-optimized .
    
    echo 📊 Docker image sizes:
    docker images | findstr earnings-table
)

echo ✅ Build optimization completed!
pause
