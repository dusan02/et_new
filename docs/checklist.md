# 🚀 Earnings Table Stabilization Checklist

## Sprint 1: Delivery Read-Only (Day 1-2)

### ✅ Setup & Infrastructure

- [ ] **Redis Setup**

  ```bash
  docker-compose up -d redis
  ```

  - [ ] Redis accessible on `localhost:6379`
  - [ ] Test connection: `redis-cli ping`

- [ ] **Environment Variables**
  - [ ] Copy `.env.example` to `.env`
  - [ ] Set `REDIS_URL=redis://localhost:6379`
  - [ ] Set `READ_ONLY=true`
  - [ ] Set `USE_PUBLISH_GATE=true`

### ✅ Static Snapshot Publishing

- [ ] **Publish Static Data**
  ```bash
  npm run publish:static
  ```
  - [ ] Check Redis keys exist:
    ```bash
    redis-cli keys "earnings:*"
    redis-cli get "earnings:latest:meta"
    ```
  ```

  ```

### ✅ API Endpoints Testing

- [ ] **Build & Start Application**

  ```bash
  npm run build && npm start
  ```

- [ ] **Test Endpoints**

  - [ ] `/api/health` → `200 OK`, Redis connected
  - [ ] `/api/earnings/today` → `status: "success"`, `source: "redis"`
  - [ ] `/api/earnings/meta` → Latest publish metadata
  - [ ] `/api/dq?day=2025-01-08` → Coverage data

- [ ] **Frontend Verification**
  - [ ] Open `http://localhost:3001`
  - [ ] Table displays data (no "No Earnings Scheduled")
  - [ ] Data shows from static snapshot
  - [ ] No console errors

### ✅ Definition of Done - Sprint 1

- [ ] **FE vždy zobrazuje dáta** - žiadne prázdne tabuľky
- [ ] **API vracia správny formát** - `status`, `source: 'redis'`, `freshness`, `coverage`
- [ ] **Redis publish-gate funguje** - staging → published atomic rename
- [ ] **Logy sú jasné** - každý krok je logovaný

---

## Sprint 2: Prices Worker + DQ Gate (Day 3-4)

### ✅ Database Schema

- [ ] **Create Tables**

  ```sql
  -- Run migration scripts
  ```

- [ ] **Test Prisma Connection**
  ```bash
  npx prisma db push
  npx prisma studio
  ```

### ✅ Prices Worker

- [ ] **Enable Prices Worker**

  - [ ] Set `ENABLE_PRICES_WORKER=true`
  - [ ] Start worker: `npm run worker:prices`

- [ ] **Test Price Fetching**
  - [ ] Worker processes tickers
  - [ ] Data saved to `prices_daily` table
  - [ ] Coverage calculated correctly

### ✅ DQ Gate & Publishing

- [ ] **Test Coverage Calculation**

  - [ ] Coverage thresholds configurable
  - [ ] DQ gate blocks low-quality data
  - [ ] High-quality data gets published

- [ ] **Test Atomic Publishing**
  - [ ] Staging data created
  - [ ] DQ check passes
  - [ ] Atomic rename to published
  - [ ] Meta updated

### ✅ Definition of Done - Sprint 2

- [ ] **Prices worker beží stabilne** - bez crashes
- [ ] **DQ gate funguje** - blokuje nízku kvalitu
- [ ] **Publishing je atomic** - staging → published
- [ ] **Coverage sa počíta správne** - percentá sú presné

---

## Sprint 3: EPS/REV Worker + Backfill (Day 5-6)

### ✅ Earnings Worker

- [ ] **Enable EPS/REV Worker**

  - [ ] Set `ENABLE_EPSREV_WORKER=true`
  - [ ] Start worker: `npm run worker:epsrev`

- [ ] **Test Earnings Fetching**
  - [ ] Worker processes earnings data
  - [ ] Data saved to `earnings_daily` table
  - [ ] Backfill jobs scheduled

### ✅ Backfill & Scheduling

- [ ] **Test Backfill Jobs**

  - [ ] 16:10 ET backfill runs
  - [ ] 20:00 ET backfill runs
  - [ ] Missing actuals get filled

- [ ] **Test Daily Reset**
  - [ ] 00:05 ET daily reset
  - [ ] New day metadata created
  - [ ] Staging keys cleared

### ✅ Watchdog & Alerts

- [ ] **Test Watchdog**
  - [ ] Checks published age every 5 min
  - [ ] Alerts if > 60 min old
  - [ ] FE still shows last published

### ✅ Definition of Done - Sprint 3

- [ ] **Denný cyklus beží** - 5 po sebe idúcich dní bez zásahu
- [ ] **Zero-data incidenty = 0** - FE nikdy prázdny
- [ ] **Backfill funguje** - missing data sa dopĺňa
- [ ] **Watchdog funguje** - alerty pri problémoch

---

## 🎯 Final Definition of Done

### ✅ All 6 Criteria Met

1. **FE vždy zobrazuje dáta** - žiadne prázdne tabuľky
2. **API vracia správny formát** - `status`, `source: 'redis'`, `freshness`, `coverage`, `flags`
3. **Denný cyklus beží** - 5 po sebe idúcich trhových dní bez manuálneho zásahu
4. **Zero-data incidenty = 0** - `publish_meta.status='published'` min. raz do 24h
5. **Logy sú jasné** - zlyhania per ticker, nie globálny pád
6. **Jednoduché rollbacky** - ak DQ neprejde, FE ostáva na predošlom `:published`

### ✅ Production Readiness

- [ ] **Monitoring** - Health checks, DQ coverage, worker status
- [ ] **Alerting** - Watchdog alerts, coverage drops
- [ ] **Documentation** - API docs, troubleshooting guide
- [ ] **Backup Strategy** - Redis persistence, DB backups

---

## 🚨 Troubleshooting

### Redis Connection Issues

```bash
# Check Redis status
docker-compose ps redis
docker-compose logs redis

# Test connection
redis-cli ping
```

### API Not Returning Data

```bash
# Check Redis keys
redis-cli keys "earnings:*"
redis-cli get "earnings:latest:meta"

# Check API logs
npm run dev
# Check browser network tab
```

### Worker Not Processing

```bash
# Check worker logs
npm run worker:prices
npm run worker:epsrev

# Check Redis queues
redis-cli keys "bull:*"
```

### Coverage Not Meeting Thresholds

```bash
# Check DQ data
curl "http://localhost:3001/api/dq?day=2025-01-08"

# Check database
npx prisma studio
```

---

## 📊 Success Metrics

- **Uptime**: 99.9% (FE always shows data)
- **Data Freshness**: < 60 minutes
- **Coverage**: Schedule ≥ 95%, Price ≥ 98%, EPS/Rev ≥ 90%
- **Zero Manual Interventions**: 5 consecutive trading days
- **Response Time**: API < 200ms, Redis < 10ms
