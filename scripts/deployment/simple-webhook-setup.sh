#!/bin/bash

# Simple webhook setup script that downloads files from GitHub
echo "🚀 Setting up webhook via GitHub download..."

# Download webhook files directly from GitHub
echo "📥 Downloading webhook files from GitHub..."
curl -o webhook-deploy.sh https://raw.githubusercontent.com/dusan02/et_new/main/webhook-deploy.sh
curl -o webhook.conf https://raw.githubusercontent.com/dusan02/et_new/main/webhook.conf

echo "📤 Files downloaded. Now you can copy them manually:"
echo "1. Copy webhook-deploy.sh to server manually"
echo "2. Copy webhook.conf to server manually"
echo "3. Or use alternative deployment method"

echo "✅ Alternative: Use GitHub Actions for deployment instead!"











