# 🚀 Production Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ Completed Changes:
- [x] **Cron jobs cleaned up** - Removed duplicate `simple-cron.js`
- [x] **Worker integration** - Using `worker-new.js` as single cron manager
- [x] **Cleanup integration** - Automatic old data cleanup (7+ days)
- [x] **Package.json updated** - `npm run cron` now uses `worker-new.js`
- [x] **Ecosystem.config.js updated** - Production PM2 config ready
- [x] **Git committed** - All changes pushed to repository

## 🏭 Production Server Details

- **Server IP:** 89.185.250.213
- **App Directory:** /var/www/earnings-table
- **User:** root
- **URLs:** 
  - https://earningstable.com
  - http://89.185.250.213:3000

## 🚀 Deployment Steps

### 1. SSH to Server
```bash
ssh root@89.185.250.213
```

### 2. Stop Existing Processes
```bash
pm2 stop all
pm2 delete all
```

### 3. Navigate to App Directory
```bash
cd /var/www/earnings-table
```

### 4. Pull Latest Changes
```bash
git pull origin main
```

### 5. Install Dependencies
```bash
npm install
```

### 6. Build Application
```bash
npm run build
```

### 7. Setup Environment
```bash
cp production.env .env.local
```

### 8. Create Logs Directory
```bash
mkdir -p logs
```

### 9. Start with PM2
```bash
pm2 start ecosystem.config.js
```

### 10. Save PM2 Configuration
```bash
pm2 save
pm2 startup
```

### 11. Verify Deployment
```bash
pm2 status
pm2 logs
```

## 📊 Monitoring Commands

### Real-time Monitoring
```bash
pm2 monit
```

### View Logs
```bash
pm2 logs
pm2 logs earnings-table
pm2 logs earnings-cron
```

### Restart if Needed
```bash
pm2 restart all
pm2 restart earnings-table
pm2 restart earnings-cron
```

## 🔧 PM2 Process Configuration

### earnings-table (Next.js App)
- **Script:** npm start
- **Port:** 3000
- **Memory Limit:** 1GB
- **Auto Restart:** Yes

### earnings-cron (Cron Worker)
- **Script:** node src/queue/worker-new.js
- **Memory Limit:** 512MB
- **Auto Restart:** Yes

## 📅 Cron Job Schedule

| Time (NY) | Job | Frequency | Description |
|-----------|-----|-----------|-------------|
| 02:00 AM | Main Fetch | Daily | Cleanup + new earnings data |
| 04:00-09:30 AM | Pre-market | Every 5 min | Pre-market updates |
| 09:30-16:00 PM | Market Hours | Every 2 min | Market data updates |
| 16:00-20:00 PM | After-hours | Every 10 min | After-hours updates |
| Weekends | Weekend | Every hour | Weekend earnings check |

## 🧹 Data Cleanup

- **Automatic cleanup** of data older than 7 days
- **Runs daily** at 2:00 AM NY time
- **Runs on startup** of cron worker
- **Cleans both** earnings and market data tables

## 🌐 Verification URLs

After deployment, verify these URLs are working:

- **Main Site:** https://earningstable.com
- **Direct IP:** http://89.185.250.213:3000
- **API Health:** http://89.185.250.213:3000/api/monitoring/health

## 🚨 Troubleshooting

### If PM2 processes fail to start:
```bash
pm2 logs
pm2 restart all
```

### If cron jobs aren't running:
```bash
pm2 logs earnings-cron
pm2 restart earnings-cron
```

### If web app isn't accessible:
```bash
pm2 logs earnings-table
pm2 restart earnings-table
```

### Check server resources:
```bash
pm2 monit
htop
df -h
```

## 📝 Post-Deployment

1. **Monitor logs** for first few hours
2. **Verify cron jobs** are running on schedule
3. **Check data updates** are working
4. **Test web application** functionality
5. **Monitor server resources** (CPU, memory, disk)

## ✅ Success Indicators

- [ ] PM2 processes running (earnings-table, earnings-cron)
- [ ] Web application accessible at both URLs
- [ ] Cron jobs executing on schedule
- [ ] Data cleanup working (check logs)
- [ ] New earnings data being fetched
- [ ] No error logs in PM2

---

**Deployment completed successfully!** 🎉