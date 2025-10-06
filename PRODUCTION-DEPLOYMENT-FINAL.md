# 🚀 Final Production Deployment - Post-Fix Checklist

## ✅ Pre-Deployment (Do This First)

### 1. Fix NODE_ENV Issue

```bash
# On production server
cd /var/www/earnings-table

# Check current NODE_ENV
echo $NODE_ENV

# If empty, add to .env.production
echo "NODE_ENV=production" >> .env.production

# Verify
cat .env.production | grep NODE_ENV
```

### 2. Commit New Files

```bash
# On local machine
git add src/app/api/health/route.ts
git add src/utils/polygon-fallback.ts
git add src/components/EarningsDashboard.tsx
git add src/app/api/earnings/route.ts
git add POLYGON-FALLBACK-INTEGRATION-EXAMPLE.md
git add PREVENTION-FIXES-SUMMARY.md
git add smoke-test-production.sh

git commit -m "fix: Add ready flag, health endpoint, and Polygon fallback

- Add meta.ready flag to prevent 'No Earnings' during fetch
- Add /api/health endpoint for monitoring
- Add Polygon 404 fallback utility
- Improve frontend guard with 3-state logic
- Add smoke test script"

git push origin main
```

---

## 🔄 Deployment Steps

### Step 1: Pull Latest Code

```bash
ssh root@89.185.250.213
cd /var/www/earnings-table
git pull
```

### Step 2: Install Dependencies (if needed)

```bash
npm install
```

### Step 3: Build with Correct NODE_ENV

```bash
# Option A: Set NODE_ENV inline
NODE_ENV=production npm run build

# Option B: Skip parity check (temporary)
PARITY_SKIP=1 npm run build

# Option C: Export NODE_ENV first
export NODE_ENV=production
npm run build
```

### Step 4: Restart PM2

```bash
pm2 restart earnings-table --update-env
pm2 restart earnings-cron --update-env

# Verify restart
pm2 list
```

### Step 5: Verify Deployment

```bash
# Make smoke test executable
chmod +x smoke-test-production.sh

# Run smoke test
./smoke-test-production.sh
```

---

## 🧪 Manual Verification

### 1. Check Health Endpoint

```bash
curl http://127.0.0.1:3001/api/health | jq

# Expected output:
{
  "status": "ok",
  "ready": true,
  "total": 19,
  "date": "2025-10-06",
  "lastFetchAt": "2025-10-06T09:25:03.000Z"
}
```

### 2. Check Main API

```bash
curl http://127.0.0.1:3001/api/earnings | jq '.meta'

# Expected output:
{
  "total": 19,
  "ready": true,
  "duration": "45ms",
  "date": "2025-10-06",
  "cached": false
}
```

### 3. Test Frontend

```bash
# Option A: curl
curl -s https://www.earningstable.com | grep -o "Preparing\|No Earnings\|ticker" | head -5

# Option B: Browser
# Open: https://www.earningstable.com
# Should see:
# - Earnings table with data
# - OR "Preparing Today's Earnings Data" (during fetch)
# - NOT "No Earnings Scheduled" (unless truly empty)
```

### 4. Check PM2 Logs

```bash
pm2 logs earnings-table --lines 20
pm2 logs earnings-cron --lines 20

# Look for:
# ✅ "Unified data fetch completed successfully!"
# ✅ "earningsCount: 19"
# ❌ No errors about 404 for common tickers (after Polygon fallback)
```

---

## 🔒 Post-Deployment Hardening

### 1. Set Up Health Monitoring

**Option A: Simple Cron**

```bash
# Add to crontab
crontab -e

# Add this line (checks every minute)
* * * * * curl -s http://127.0.0.1:3001/api/health | jq -e '.ready == true' || echo "⚠️ API not ready at $(date)" >> /var/log/earnings-health.log
```

**Option B: UptimeRobot / Pingdom**

- URL: `https://www.earningstable.com/api/health`
- Interval: 1-5 minutes
- Alert condition: `ready: false` for > 5 minutes OR status != 200
- Notification: Email/SMS/Slack

### 2. Set Up Sanity Alerts

```bash
# Daily sanity check (at 2 PM CET, after market open)
# crontab -e
0 14 * * 1-5 /var/www/earnings-table/scripts/sanity-check.sh
```

Create `scripts/sanity-check.sh`:

```bash
#!/bin/bash
HEALTH=$(curl -s http://127.0.0.1:3001/api/health)
TOTAL=$(echo "$HEALTH" | jq -r '.total')
READY=$(echo "$HEALTH" | jq -r '.ready')

if [ "$READY" != "true" ]; then
  echo "⚠️ API not ready at $(date)" | mail -s "EarningsTable Alert" admin@example.com
fi

if [ "$TOTAL" -lt 5 ]; then
  echo "⚠️ Low earnings count ($TOTAL) at $(date)" | mail -s "EarningsTable Alert" admin@example.com
fi
```

### 3. Enable PM2 Monitoring (Optional)

```bash
# PM2 Plus monitoring (free tier)
pm2 link <secret_key> <public_key>

# Or use PM2 metrics
pm2 install pm2-server-monit
```

---

## 🎯 Success Criteria

Check all these boxes:

- [ ] `NODE_ENV=production` is set
- [ ] Build completes without errors
- [ ] PM2 processes are online (earnings-table + earnings-cron)
- [ ] `/api/health` returns `ready: true`
- [ ] `/api/earnings` returns `meta.ready: true`
- [ ] Frontend shows earnings data (or "Preparing..." during fetch)
- [ ] No "No Earnings Scheduled" during initial fetch window
- [ ] Smoke test passes (all green)
- [ ] PM2 logs show no critical errors
- [ ] Public domain (www.earningstable.com) loads correctly

---

## 🚨 Rollback Plan (If Something Breaks)

```bash
cd /var/www/earnings-table

# 1. Rollback code
git log --oneline -5  # Find previous commit hash
git reset --hard <previous-commit-hash>

# 2. Rebuild
NODE_ENV=production npm run build

# 3. Restart
pm2 restart all --update-env

# 4. Verify
./smoke-test-production.sh

# 5. If still broken, use last known good build
pm2 restart earnings-table --update-env
```

---

## 📞 Support Contacts

If deployment fails:

1. **Check logs:**

   ```bash
   pm2 logs earnings-table --lines 100
   pm2 logs earnings-cron --lines 100
   tail -100 /var/log/nginx/error.log
   ```

2. **Check disk space:**

   ```bash
   df -h
   ```

3. **Check memory:**

   ```bash
   free -h
   pm2 monit
   ```

4. **Emergency restart:**
   ```bash
   pm2 restart all --update-env
   ```

---

## 🎉 Post-Deployment Tasks

After successful deployment:

1. **Monitor for 1 hour:**

   - Watch PM2 logs
   - Check health endpoint every 5 minutes
   - Verify frontend loads correctly

2. **Document changes:**

   - Update CHANGELOG.md
   - Note any issues encountered
   - Record deployment timestamp

3. **Test edge cases:**

   - Restart server (simulate cold start)
   - Clear cache and verify fetch
   - Test during off-hours (weekend)

4. **Update team:**
   - Notify team of deployment
   - Share smoke test results
   - Document any breaking changes

---

## 📝 Notes

- **Build time:** ~2-3 minutes
- **Restart time:** ~10 seconds
- **Initial fetch:** ~1.5 minutes
- **Expected downtime:** < 15 seconds

---

**Deployment checklist complete!** ✅
