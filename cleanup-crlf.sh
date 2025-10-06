#!/bin/bash
# 🧹 Cleanup CRLF/Windows line endings

set -e

echo "🧹 CRLF CLEANUP"
echo "==============="

# Install dos2unix if not present
if ! command -v dos2unix &> /dev/null; then
    echo "📦 Installing dos2unix..."
    apt-get update && apt-get install -y dos2unix
fi

echo "🔄 Converting files..."

# Convert shell scripts
find . -type f -name "*.sh" -exec dos2unix {} \;

# Convert env files
find . -type f \( -name "*.env" -o -name ".env.*" -o -name "env.*" \) -exec dos2unix {} \;

# Convert config files
find . -type f \( -name "*.conf" -o -name "*.config.js" \) -exec dos2unix {} \;

echo "✅ CRLF cleanup completed!"

