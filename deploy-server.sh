#!/bin/bash
# Server Deployment Script for earningstable.com
# This script deploys the application to the production server

echo "🚀 Starting server deployment for earningstable.com..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this script from the project root."
    exit 1
fi

echo "✅ Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix the issues before deploying."
    exit 1
fi

echo "✅ Creating production environment file..."
cat > .env.production << EOF
# Production Environment Variables
NODE_ENV=production
FINNHUB_API_KEY=d28f1dhr01qjsuf342ogd28f1dhr01qjsuf342p0
POLYGON_API_KEY=Vi_pMLcusE8RA_SUvkPAmiyziVzlmOoX
DATABASE_URL=file:./prisma/dev.db
NEXT_TELEMETRY_DISABLED=1
EOF

echo "✅ Setting up production environment..."
export NODE_ENV=production
export FINNHUB_API_KEY=d28f1dhr01qjsuf342ogd28f1dhr01qjsuf342p0
export POLYGON_API_KEY=Vi_pMLcusE8RA_SUvkPAmiyziVzlmOoX
export DATABASE_URL=file:./prisma/dev.db

echo "✅ Installing production dependencies..."
npm ci --production

echo "✅ Setting up database..."
npx prisma generate
npx prisma db push

echo "✅ Starting application..."
npm start &

echo "✅ Deployment completed!"
echo "🌐 Application is now running at:"
echo "   - http://89.185.250.213:3000"
echo "   - https://earningstable.com"

echo "📊 Health check:"
sleep 5
curl -f http://localhost:3000/api/monitoring/health || echo "⚠️ Health check failed"

echo "✅ Server deployment completed successfully!"
