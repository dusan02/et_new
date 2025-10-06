# 🔍 Production Debug Guide: "No Earnings Scheduled"

**Issue:** Production site (www.earningstable.com) shows "No Earnings Scheduled" on Monday, October 6, 2025, but data should exist.

## 🎯 Quick Start

```bash
# 1. SSH into production server
ssh user@earningstable.com

# 2. Navigate to project directory
cd /path/to/EarningsTableUbuntu

# 3. Run diagnostic script
bash diagnose-production.sh
```

---

## 📋 Diagnostic Checklist

### ✅ Phase I: CRON / Data Fetch (Source)

**Question:** Is today's cron job running and fetching data?

**Check:**

```bash
# 1. Check PM2 status
pm2 list

# 2. Check PM2 logs for fetch-today job
pm2 logs earnings-table --lines 50

# 3. Look for these log entries:
#    - "Starting unified data fetch for 2025-10-06"
#    - "Unified data fetch completed successfully!"
#    - "earningsCount: X, marketCount: Y"

# 4. Check if cron is scheduled
crontab -l | grep fetch-today
```

**Expected Output:**

- PM2 should show `earnings-table` process running
- Logs should show successful fetch for today's date (2025-10-06)
- Should see "earningsCount: X" where X > 0

**If FAIL:**

- Cron job not running → restart PM2: `pm2 restart earnings-table`
- Cron job failing → check API keys in `.env.production`
- Date mismatch → check timezone settings

---

### ✅ Phase II: Database Layer

**Question:** Are today's earnings records actually in the database?

**Check:**

```bash
# Option A: Use Prisma Studio (if available)
npx prisma studio

# Option B: Direct SQL query
npx prisma db execute --stdin < check-database-manual.sql

# Option C: Node.js quick check
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const today = new Date('2025-10-06T00:00:00.000Z');
  const count = await prisma.earningsTickersToday.count({
    where: { reportDate: today }
  });
  console.log('Today earnings count:', count);

  // Show all dates
  const dates = await prisma.\$queryRaw\`
    SELECT DATE(reportDate) as date, COUNT(*) as count
    FROM EarningsTickersToday
    GROUP BY DATE(reportDate)
    ORDER BY date DESC
    LIMIT 10
  \`;
  console.log('Recent dates:', dates);
  await prisma.\$disconnect();
})();
"
```

**Expected Output:**

- Should see records with `reportDate = 2025-10-06T00:00:00.000Z`
- Count > 0 for today's date

**If FAIL:**

- No records → cron job didn't run or failed
- Wrong date format → timezone issue in fetch-today.ts
- Old dates only → cron job stuck or not running daily

---

### ✅ Phase III: API Layer

**Question:** Is the API endpoint returning data correctly?

**Check:**

```bash
# 1. Test API endpoint directly
curl http://localhost:3000/api/earnings | jq

# 2. Check response metadata
curl http://localhost:3000/api/earnings | jq '.meta'

# 3. Check data array
curl http://localhost:3000/api/earnings | jq '.data | length'

# 4. Clear cache and retry
curl -X POST http://localhost:3000/api/earnings/clear-cache
curl http://localhost:3000/api/earnings | jq '.meta'
```

**Expected Output:**

```json
{
  "status": "ok",
  "data": [...],  // array with length > 0
  "meta": {
    "total": 123,  // should be > 0
    "date": "2025-10-06",
    "fallbackUsed": false,
    "cached": false
  }
}
```

**If FAIL:**

- `status: "no-data"` → API can't find data in DB
- `data: []` but DB has records → date filter issue in API
- Cache returning old data → clear cache and retry
- Different date in meta → timezone mismatch

**Common Issues:**

```javascript
// Check API date calculation (src/app/api/earnings/route.ts:79-80)
const todayString = requestedDate || isoDate(); // Should be '2025-10-06'
const today = new Date(todayString + "T00:00:00.000Z"); // Should be UTC midnight
```

---

### ✅ Phase IV: Frontend Layer

**Question:** Is the frontend receiving and displaying data?

**Check:**

```bash
# 1. Open browser DevTools (F12) on www.earningstable.com

# 2. Go to Network tab

# 3. Filter for 'earnings'

# 4. Look for request to /api/earnings

# 5. Check:
#    - Status: 200 OK
#    - Response data array length
#    - Response meta.total value
```

**Expected:**

- Request to `/api/earnings` should return 200 OK
- Response `data` array should not be empty
- Frontend should display the earnings table

**If FAIL:**

- Network request shows data but UI shows "No Earnings" → frontend state issue
- Network request shows empty → API issue (go to Phase III)
- No network request → frontend not calling API (check console errors)

**Common Issues:**

```typescript
// Check frontend data handling (src/components/EarningsDashboard.tsx:125-127)
if (earningsResult.data) {
  setEarningsData(earningsResult.data); // Should set data
}
```

---

### ✅ Phase V: Environment & Configuration

**Question:** Is production using correct environment variables?

**Check:**

```bash
# 1. Check DATABASE_URL
echo $DATABASE_URL
# Should point to production database, not dev.db

# 2. Check .env.production file
cat .env.production | grep DATABASE_URL

# 3. Check if PM2 is loading correct env
pm2 env earnings-table | grep DATABASE_URL

# 4. Check timezone
echo $TZ
date
TZ=America/New_York date
```

**Expected:**

- `DATABASE_URL` should be production database (not `file:./prisma/dev.db`)
- Timezone should be set or handled correctly in code

**If FAIL:**

- Wrong DATABASE_URL → update `.env.production` and restart PM2
- Missing env vars → copy from `env.production.example`
- Timezone issues → check server timezone vs code timezone

---

### ✅ Phase VI: Timezone & Date Calculation

**Question:** Is date calculation handling timezones correctly?

**Key Code Locations:**

1. `src/modules/shared/utils/date.utils.ts` - `isoDate()` function
2. `src/jobs/fetch-today.ts:442` - date parameter
3. `src/app/api/earnings/route.ts:79-80` - date parsing

**Check:**

```bash
# 1. What date does server think it is?
date -u +"%Y-%m-%d"  # UTC
date +"%Y-%m-%d"      # Local
TZ=America/New_York date +"%Y-%m-%d"  # NY time

# 2. What date does Node.js calculate?
node -e "console.log(new Date().toISOString().split('T')[0])"

# 3. What date is in the database?
npx prisma db execute --stdin <<< "SELECT DISTINCT DATE(reportDate) FROM EarningsTickersToday ORDER BY reportDate DESC LIMIT 5;"
```

**Common Issues:**

- Server is in different timezone → date mismatch
- Cron runs at wrong time → gets tomorrow's or yesterday's data
- Date parsing inconsistency → UTC vs local time confusion

---

## 🎯 Most Common Root Causes

### 1️⃣ Cron Job Not Running

**Symptoms:** No logs, no database records for today
**Fix:**

```bash
pm2 restart earnings-table
pm2 logs earnings-table --lines 50
```

### 2️⃣ Wrong Database URL

**Symptoms:** API works locally but not in production
**Fix:**

```bash
# Check DATABASE_URL
echo $DATABASE_URL

# If wrong, update .env.production
nano .env.production
pm2 restart earnings-table
```

### 3️⃣ Timezone Mismatch

**Symptoms:** Data exists but for "wrong" date
**Fix:**

```typescript
// In src/modules/shared/utils/date.utils.ts
export const isoDate = (): string => {
  // Use NY timezone for consistency
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
};
```

### 4️⃣ Cache Serving Old Data

**Symptoms:** Clearing cache fixes issue temporarily
**Fix:**

```bash
curl -X POST http://localhost:3000/api/earnings/clear-cache
pm2 restart earnings-table
```

### 5️⃣ Date Filter in API Wrong

**Symptoms:** DB has data, API returns empty
**Fix:** Check `src/app/api/earnings/route.ts:118-119`

```typescript
let combinedRows = await prisma.earningsTickersToday.findMany({
  where: { reportDate: today }, // Ensure this matches DB date format
  // ...
});
```

---

## 🚀 Quick Fixes

### Fix 1: Restart Everything

```bash
pm2 restart earnings-table
curl -X POST http://localhost:3000/api/earnings/clear-cache
```

### Fix 2: Manual Fetch Today's Data

```bash
cd /path/to/EarningsTableUbuntu
NODE_ENV=production node -r dotenv/config src/jobs/fetch-today.ts
```

### Fix 3: Check and Fix Database Connection

```bash
# Test database connection
npx prisma db push --accept-data-loss

# Regenerate Prisma Client
npx prisma generate
```

---

## 📊 Expected Results (Monday, Oct 6, 2025)

Based on typical Monday earnings schedules, you should see:

- **50-200 companies** reporting earnings
- Mix of **BMO** (Before Market Open) and **AMC** (After Market Close)
- Various market caps (Mega, Large, Mid, Small)

If you see **0 companies**, there's definitely an issue.

---

## 🆘 Still Not Working?

If none of the above fixes work, run:

```bash
# Full diagnostic output
bash diagnose-production.sh > diagnostic-output.txt 2>&1

# Share this file for further debugging
cat diagnostic-output.txt
```

Then check:

1. Finnhub API rate limits → https://finnhub.io/dashboard
2. Polygon API rate limits → https://polygon.io/dashboard
3. Server disk space → `df -h`
4. Server memory → `free -h`
5. Database locks → `fuser /path/to/database.db`

---

## 📝 Logging Improvements

Add these to help future debugging:

### In `src/jobs/fetch-today.ts`:

```typescript
console.log("[FETCH] Starting fetch for date:", date);
console.log("[FETCH] Current server time:", new Date().toISOString());
console.log("[FETCH] NY time:", getNYTimeString());
console.log(
  "[FETCH] DATABASE_URL:",
  process.env.DATABASE_URL?.slice(0, 30) + "..."
);
```

### In `src/app/api/earnings/route.ts`:

```typescript
console.log("[API] Query for date:", todayString);
console.log("[API] Where clause:", { reportDate: today });
console.log("[API] Found rows:", combinedRows.length);
console.log("[API] Sample row:", combinedRows[0]);
```

---

## ✅ Success Criteria

You've fixed the issue when:

1. ✅ PM2 logs show successful fetch for today's date
2. ✅ Database contains records with `reportDate = 2025-10-06T00:00:00.000Z`
3. ✅ API `/api/earnings` returns `status: "ok"` with `meta.total > 0`
4. ✅ Frontend displays earnings table with companies
5. ✅ "No Earnings Scheduled" message is gone

---

## 📞 Contact

If issue persists, gather:

- Output of `diagnose-production.sh`
- Last 100 lines of PM2 logs
- Database query results
- API response JSON

And create GitHub issue or contact support.
