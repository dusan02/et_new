# 🚨 Production Runbook

## Quick Response Guide

### 🚨 Critical Issues (API Returns 0)

**Symptom:** API returns 0 items when it should have data

**Immediate Actions:**

1. Check database: `sqlite3 prisma/dev.db "SELECT COUNT(*) FROM EarningsTickersToday WHERE date(reportDate) = date('now');"`
2. Check API logs for date range: `[API][QUERY] window=... count=0`
3. Run smoke test: `node scripts/ci-smoke-test.js`

**Root Causes & Fixes:**

- **Date mismatch:** API uses UTC, data in different timezone → Check timezone consistency
- **Empty DB:** No data fetched today → Run: `npm run job:fetch`
- **Cache issue:** API serving stale data → Restart server, check `Cache-Control: no-store`

### ⚠️ Data Inconsistency Alerts

**Symptom:** `finnhub>0 && db==0` or `db>0 && api==0`

**Actions:**

1. Check alert logs: `grep "\[ALERT\]" logs/*.log`
2. Verify environment: `npm run smoke` (should show 5 tickers)
3. Check Redis: `redis-cli GET earnings:today` (if using Redis)

**Fixes:**

- **DB write failure:** Check Prisma connection, disk space
- **API route error:** Check server logs, restart if needed
- **Timezone mismatch:** Ensure UTC consistency across all components

### 🔄 Cron Job Issues

**Symptom:** No daily data updates, stale data

**Actions:**

1. Check cron lock: `redis-cli GET cron:lock:fetch-today`
2. Check last run: `grep "\[DAILY\]" logs/*.log | tail -1`
3. Manual run: `npm run job:fetch`

**Fixes:**

- **Lock stuck:** `redis-cli DEL cron:lock:fetch-today`
- **API rate limits:** Check Finnhub/Polygon quota, wait for reset
- **Environment issues:** Verify `.env` file, restart cron

### 🌐 API Rate Limits

**Symptom:** `429 Too Many Requests` or `Request failed with status code 429`

**Actions:**

1. Check API quotas in provider dashboards
2. Implement exponential backoff
3. Use fallback data if available

**Prevention:**

- Monitor API usage
- Implement request queuing
- Cache responses appropriately

### 💾 Redis Issues

**Symptom:** `Redis connection failed` or empty cache

**Actions:**

1. Check Redis health: `redis-cli PING`
2. Check memory usage: `redis-cli INFO memory`
3. Restart Redis if needed: `systemctl restart redis`

**Fallback:**

- System works without Redis (uses DB directly)
- Check `[CACHE] MISS - fetching fresh data` logs

### 🔧 Environment Issues

**Symptom:** `Invalid environment configuration` or missing API keys

**Actions:**

1. Check `.env` file exists and has required variables
2. Verify API keys are valid and not expired
3. Restart application after env changes

**Required Variables:**

```bash
DATABASE_URL=file:./prisma/dev.db
FINNHUB_API_KEY=your_key
POLYGON_API_KEY=your_key
```

## Quick Commands

### Health Checks

```bash
# API health
curl -s "http://localhost:3000/api/earnings?nocache=1" | jq '.meta.total'

# Database check
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM EarningsTickersToday WHERE date(reportDate) = date('now');"

# Smoke test
npm run smoke
```

### Emergency Fixes

```bash
# Force data refresh
npm run job:fetch

# Clear stuck locks
redis-cli DEL cron:lock:fetch-today

# Restart services
systemctl restart earnings-table
systemctl restart redis
```

### Monitoring

```bash
# Watch logs
tail -f logs/app.log | grep -E "\[ALERT\]|\[ERROR\]|\[DAILY\]"

# Check system resources
htop
df -h
free -h
```

## Escalation

**Level 1:** Check logs, run health checks, restart services
**Level 2:** Check external APIs, verify environment, manual data refresh
**Level 3:** Contact API providers, check system resources, rollback if needed

## Success Indicators

✅ `[DAILY] finnhub=5 db=5 published=5 api=5 tz=UTC`
✅ API returns `count: 5` with valid tickers
✅ No `[ALERT]` or `[ERROR]` messages in logs
✅ Smoke test passes: `npm run smoke`
