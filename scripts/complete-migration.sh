#!/bin/bash

# Complete Migration Script - One command to rule them all
# Usage: ./scripts/complete-migration.sh

set -e

echo "🎯 COMPLETE MIGRATION - Starting fresh approach"
echo "================================================"

# Make scripts executable
chmod +x scripts/clean-server.sh
chmod +x scripts/migrate-to-server.sh

echo "📋 Step 1: Cleaning server..."
./scripts/clean-server.sh

echo "📋 Step 2: Migrating project..."
./scripts/migrate-to-server.sh

echo "🎉 MIGRATION COMPLETED SUCCESSFULLY!"
echo "================================================"
echo "🌐 Your application is now available at:"
echo "   http://89.185.250.213:3000"
echo ""
echo "📊 API endpoints:"
echo "   http://89.185.250.213:3000/api/earnings"
echo "   http://89.185.250.213:3000/api/earnings/stats"
echo ""
echo "🔧 To check status:"
echo "   ssh root@89.185.250.213 'cd /opt/earnings-table && docker-compose -f deployment/docker-compose.yml ps'"
echo ""
echo "📝 To view logs:"
echo "   ssh root@89.185.250.213 'cd /opt/earnings-table && docker-compose -f deployment/docker-compose.yml logs app'"