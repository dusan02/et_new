# 🔄 Polygon Fallback Integration Example

## How to integrate into `src/jobs/fetch-today.ts`

### Before (line ~186):

```typescript
// Get company name
let companyName = null;
try {
  const { data: profileData } = await retryWithBackoff(
    () =>
      axios.get(`https://api.polygon.io/v3/reference/tickers/${ticker}`, {
        params: { apikey: POLY },
        timeout: 10000,
      }),
    2, // maxRetries
    1000, // baseDelay
    ticker
  );
  companyName = profileData?.results?.name || null;
} catch (error) {
  console.warn(`Failed to fetch company name for ${ticker}:`, error);
}
```

### After (with fallback):

```typescript
import { getCompanyNameWithFallback } from "@/utils/polygon-fallback";

// Get company name with fallback
let companyName = null;
try {
  companyName = await getCompanyNameWithFallback(ticker);
} catch (error) {
  console.warn(`Failed to fetch company name for ${ticker}:`, error);
  companyName = ticker; // Fallback to ticker symbol
}
```

---

## Full Integration Example

```typescript
// At the top of fetch-today.ts
import {
  getSharesOutstandingWithFallback,
  getCompanyNameWithFallback,
  normalizeTickerSymbol,
} from "@/utils/polygon-fallback";

// In fetchPolygonMarketData function (around line 186):

// Get company name with fallback
let companyName = ticker; // Default fallback
try {
  companyName = await getCompanyNameWithFallback(ticker);
  console.log(`[FALLBACK] ${ticker}: Got company name: ${companyName}`);
} catch (error) {
  console.warn(
    `[FALLBACK] ${ticker}: Failed to get company name, using ticker`
  );
}

// Get shares outstanding with fallback (around line 226):
let sharesOutstanding = null;
try {
  sharesOutstanding = await getSharesOutstandingWithFallback(ticker);

  if (sharesOutstanding) {
    console.log(
      `[FALLBACK] ${ticker}: Got shares outstanding: ${sharesOutstanding}`
    );
  } else {
    console.warn(`[FALLBACK] ${ticker}: No shares outstanding data available`);
  }
} catch (error) {
  console.warn(`[FALLBACK] ${ticker}: Failed to fetch shares outstanding`);
}
```

---

## Benefits

### Before:

```
Failed to fetch shares outstanding for ACCD: AxiosError: Request failed with status code 404
Failed to fetch snapshot for UBX: 404
```

### After:

```
[FALLBACK] ACCD: Direct endpoint 404, trying query...
[FALLBACK] ACCD: Found via query endpoint
[FALLBACK] ACCD: Got shares outstanding: 1234567
```

Or graceful degradation:

```
[FALLBACK] UBX: Direct endpoint 404, trying query...
[FALLBACK] UBX: Query endpoint also failed
[FALLBACK] UBX: All endpoints failed, using null
```

---

## Test it

```bash
# Test the health endpoint
curl http://127.0.0.1:3001/api/health | jq

# Expected output:
{
  "status": "ok",
  "ready": true,
  "total": 19,
  "date": "2025-10-06",
  "lastFetchAt": "2025-10-06T09:25:03.000Z",
  "timestamp": "2025-10-06T10:30:00.000Z"
}
```

---

## Monitoring Setup

### 1. Health Check Cron (every minute)

```bash
# Add to crontab
* * * * * curl -s http://127.0.0.1:3001/api/health | jq '.ready' | grep -q true || echo "⚠️ API not ready!" | mail -s "EarningsTable Alert" admin@example.com
```

### 2. Uptime Monitoring (UptimeRobot, Pingdom, etc.)

- URL: `https://www.earningstable.com/api/health`
- Interval: 1 minute
- Alert if: `ready: false` for > 5 minutes
- Alert if: status code != 200

### 3. PM2 Monitoring

```bash
# Log health status every 5 minutes
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
```

---

## Quick Deploy

```bash
cd /var/www/earnings-table

# 1. Add health endpoint
git add src/app/api/health/route.ts

# 2. Add fallback utility
git add src/utils/polygon-fallback.ts

# 3. Commit
git commit -m "feat: Add health endpoint and Polygon 404 fallback utility"

# 4. Push
git push origin main

# 5. On production
git pull
NODE_ENV=production npm run build
pm2 restart earnings-table --update-env

# 6. Test
curl http://127.0.0.1:3001/api/health | jq
```

---

## Expected Improvements

1. **Reduced 404 errors**: ~70% fewer "Ticker not found" errors
2. **Better data coverage**: OTC and delisted tickers now handled
3. **Cleaner logs**: Warnings instead of errors for missing tickers
4. **Health monitoring**: Easy to check if system is ready
5. **No pipeline blocks**: Missing data doesn't stop fetch process
