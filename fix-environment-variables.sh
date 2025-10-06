#!/bin/bash

# Fix Environment Variables
echo "=== FIXING ENVIRONMENT VARIABLES ==="

cd /var/www/earnings-table

# Check current environment variables
echo "Current environment variables:"
echo "NODE_ENV: $NODE_ENV"
echo "NEXT_PUBLIC_APP_URL: $NEXT_PUBLIC_APP_URL"
echo "DATABASE_URL: $DATABASE_URL"

# Add missing NEXT_PUBLIC_APP_URL to .env.production
echo "Adding NEXT_PUBLIC_APP_URL to .env.production..."
if ! grep -q "NEXT_PUBLIC_APP_URL" .env.production; then
    echo "NEXT_PUBLIC_APP_URL=https://earningstable.com" >> .env.production
    echo "✅ Added NEXT_PUBLIC_APP_URL to .env.production"
else
    echo "✅ NEXT_PUBLIC_APP_URL already exists in .env.production"
fi

# Verify environment file
echo "Environment file contents:"
cat .env.production | grep -E "(NODE_ENV|NEXT_PUBLIC_APP_URL|DATABASE_URL)"

echo "=== ENVIRONMENT VARIABLES FIX COMPLETED ==="
