# 🚀 Server Deployment Guide

## Problem
The server is returning 500 Internal Server Error because:
1. Environment variables are not set on the server
2. Application might not be running
3. Database might not be initialized

## Solution

### Step 1: Upload Files to Server
Upload these files to your server:
- `.next/` (build output)
- `.env.production`
- `package.json`
- `package-lock.json`
- `prisma/` (database files)
- `public/` (static files)

### Step 2: Set Environment Variables
```bash
export NODE_ENV=production
export FINNHUB_API_KEY=d28f1dhr01qjsuf342ogd28f1dhr01qjsuf342p0
export POLYGON_API_KEY=Vi_pMLcusE8RA_SUvkPAmiyziVzlmOoX
export DATABASE_URL=file:./prisma/dev.db
export NEXT_TELEMETRY_DISABLED=1
```

### Step 3: Install Dependencies
```bash
npm ci --production
```

### Step 4: Setup Database
```bash
npx prisma generate
npx prisma db push
```

### Step 5: Start Application

#### Option A: Direct Start
```bash
npm start
```

#### Option B: PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start ecosystem-server.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Option C: Systemd Service
```bash
# Copy service file
sudo cp earningstable.service /etc/systemd/system/

# Edit the service file to set correct paths
sudo nano /etc/systemd/system/earningstable.service

# Enable and start service
sudo systemctl enable earningstable
sudo systemctl start earningstable
sudo systemctl status earningstable
```

### Step 6: Verify Deployment
```bash
# Check if application is running
curl http://localhost:3000/api/monitoring/health

# Check if API endpoints work
curl http://localhost:3000/api/earnings
curl http://localhost:3000/api/earnings/stats
```

### Step 7: Configure Nginx (if needed)
```nginx
server {
    listen 80;
    server_name earningstable.com www.earningstable.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Troubleshooting

### Check Application Status
```bash
# Check if Node.js process is running
ps aux | grep node

# Check PM2 status
pm2 status

# Check systemd status
sudo systemctl status earningstable
```

### Check Logs
```bash
# PM2 logs
pm2 logs earningstable

# Systemd logs
sudo journalctl -u earningstable -f

# Application logs
tail -f logs/combined.log
```

### Common Issues
1. **Port 3000 already in use**: Change PORT environment variable
2. **Database connection failed**: Check DATABASE_URL and file permissions
3. **API keys not working**: Verify FINNHUB_API_KEY and POLYGON_API_KEY
4. **Build errors**: Run `npm run build` locally and upload .next folder

## Environment Variables Reference
```bash
NODE_ENV=production
FINNHUB_API_KEY=d28f1dhr01qjsuf342ogd28f1dhr01qjsuf342p0
POLYGON_API_KEY=Vi_pMLcusE8RA_SUvkPAmiyziVzlmOoX
DATABASE_URL=file:./prisma/dev.db
NEXT_TELEMETRY_DISABLED=1
PORT=3000
```

## URLs
- **Server**: http://89.185.250.213:3000
- **Domain**: https://earningstable.com
- **Health Check**: http://89.185.250.213:3000/api/monitoring/health
