# 🚀 Production Deployment Commands

## Manual Deployment via SSH

Connect to server: `ssh root@89.185.250.213`

Then run these commands:

```bash
# Navigate to application directory
cd /var/www/earnings-table

# Pull latest changes with our fixes
git pull origin main

# Install dependencies
npm ci --production

# Generate Prisma client
npx prisma generate

# Build application
npm run build

# Stop existing processes
pkill -f "next" 2>/dev/null || true
sleep 2

# Start application
NODE_ENV=production nohup npm start > /var/log/earnings-table.log 2>&1 &

# Wait for startup
sleep 10

# Health check
curl -f http://localhost:3000

# Check if it's running
ps aux | grep node | grep -v grep
```

## Alternative: Use webhook script

```bash
# On server, run the webhook deployment script
cd /var/www/earnings-table
bash webhook-deploy.sh
```

## Verify deployment

After deployment, test:

- Main site: http://89.185.250.213:3000
- API: http://89.185.250.213:3000/api/earnings
- Check logs: `tail -f /var/log/earnings-table.log`

## Recent fixes included:

- ✅ Fixed Cap Diff and Change values display
- ✅ Fixed zero value handling in conditional checks
- ✅ Fixed formatMarketCapDiff function for negative values
- ✅ Fixed EPS Beat/Revenue Beat calculations with null checks
- ✅ Updated both desktop and mobile views
