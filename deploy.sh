#!/bin/bash

# Production Deployment Script for EarningsTable
# Run this script to deploy to production

echo "🚀 Starting EarningsTable Production Deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# 2. Generate Prisma client
echo "🗄️ Generating Prisma client..."
npx prisma generate

# 3. Run database migrations
echo "🔄 Running database migrations..."
npx prisma db push

# 4. Build the application
echo "🏗️ Building application..."
npm run build

# 5. Create production directory structure
echo "📁 Creating production structure..."
mkdir -p production/{logs,data,backups}

# 6. Copy production files
echo "📋 Copying production files..."
cp -r .next production/
cp -r public production/
cp -r prisma production/
cp package.json production/
cp package-lock.json production/
cp next.config.js production/
cp production.env production/.env.local

# 7. Create production package.json
echo "📝 Creating production package.json..."
cat > production/package.json << EOF
{
  "name": "earnings-table-production",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "next start -p 3000",
    "cron": "node src/queue/worker-new.js"
  },
  "dependencies": {
    "@prisma/client": "^5.7.0",
    "@tanstack/react-table": "^8.10.0",
    "@tanstack/react-virtual": "^3.13.12",
    "autoprefixer": "^10.4.0",
    "axios": "^1.6.0",
    "clsx": "^2.1.1",
    "dotenv": "^17.2.2",
    "lru-cache": "^11.2.1",
    "lucide-react": "^0.294.0",
    "next": "^15.0.0",
    "node-cron": "^4.2.1",
    "node-fetch": "^3.3.2",
    "postcss": "^8.4.0",
    "prisma": "^5.7.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.8.0",
    "swr": "^2.2.0",
    "tailwind-merge": "^2.0.0",
    "tailwindcss": "^3.3.0"
  }
}
EOF

# 8. Create systemd service file
echo "⚙️ Creating systemd service..."
cat > production/earnings-table.service << EOF
[Unit]
Description=EarningsTable Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/earnings-table/production
ExecStart=/usr/bin/node_modules/.bin/next start -p 3000
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/var/www/earnings-table/production/.env.local

[Install]
WantedBy=multi-user.target
EOF

# 9. Create cron service file
echo "⏰ Creating cron service..."
cat > production/earnings-cron.service << EOF
[Unit]
Description=EarningsTable Cron Worker
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/earnings-table/production
ExecStart=/usr/bin/node src/queue/worker-new.js
Restart=always
RestartSec=30
Environment=NODE_ENV=production
EnvironmentFile=/var/www/earnings-table/production/.env.local

[Install]
WantedBy=multi-user.target
EOF

# 10. Create nginx configuration
echo "🌐 Creating nginx configuration..."
cat > production/nginx.conf << EOF
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration (replace with your certificates)
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Static files caching
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
EOF

# 11. Create deployment instructions
echo "📖 Creating deployment instructions..."
cat > production/DEPLOYMENT.md << EOF
# EarningsTable Production Deployment

## Prerequisites
- Node.js 18+ installed
- PostgreSQL database
- Nginx web server
- SSL certificates

## Deployment Steps

### 1. Database Setup
\`\`\`bash
# Create PostgreSQL database
createdb earnings_table_prod

# Update DATABASE_URL in .env.local
DATABASE_URL="postgresql://username:password@localhost:5432/earnings_table_prod"
\`\`\`

### 2. Install Dependencies
\`\`\`bash
cd production
npm install --production
\`\`\`

### 3. Database Migration
\`\`\`bash
npx prisma db push
\`\`\`

### 4. Start Services
\`\`\`bash
# Start main application
sudo systemctl start earnings-table
sudo systemctl enable earnings-table

# Start cron worker
sudo systemctl start earnings-cron
sudo systemctl enable earnings-cron
\`\`\`

### 5. Configure Nginx
\`\`\`bash
# Copy nginx config
sudo cp nginx.conf /etc/nginx/sites-available/earnings-table
sudo ln -s /etc/nginx/sites-available/earnings-table /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
\`\`\`

### 6. SSL Setup (Let's Encrypt)
\`\`\`bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
\`\`\`

## Monitoring
- Check logs: \`journalctl -u earnings-table -f\`
- Check cron logs: \`journalctl -u earnings-cron -f\`
- Monitor database: \`npx prisma studio\`

## Backup
\`\`\`bash
# Database backup
pg_dump earnings_table_prod > backup_\$(date +%Y%m%d_%H%M%S).sql
\`\`\`
EOF

echo "✅ Production deployment package created in 'production/' directory"
echo "📋 Next steps:"
echo "1. Copy 'production/' directory to your server"
echo "2. Follow instructions in production/DEPLOYMENT.md"
echo "3. Update environment variables in production/.env.local"
echo "4. Configure your domain and SSL certificates"
echo ""
echo "🎉 Deployment package ready!"
