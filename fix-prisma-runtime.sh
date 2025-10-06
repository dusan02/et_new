#!/bin/bash

# Fix Prisma Client Runtime Error
echo "=== FIXING PRISMA CLIENT RUNTIME ERROR ==="

cd /var/www/earnings-table

# Remove corrupted Prisma client
echo "Removing corrupted Prisma client..."
rm -rf node_modules/@prisma

# Reinstall Prisma client
echo "Reinstalling Prisma client..."
npm install @prisma/client@latest

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Verify installation
echo "Verifying Prisma client installation..."
ls -la node_modules/@prisma/client/runtime/ | head -10

echo "=== PRISMA CLIENT FIX COMPLETED ==="
