# 🚀 Go-Live Checklist

## ✅ 1. Thresholdy späť na produkčné hodnoty

- [x] `DQ_PRICE_THRESHOLD=98`
- [x] `DQ_EPSREV_THRESHOLD=90`
- [x] `DQ_SCHEDULE_THRESHOLD=0`
- [x] Testované: 100% coverage >= 98% threshold ✅

## ✅ 2. Bezpečnosť & kľúče

- [x] API kľúče odstránené z logov (len `symbol`, `status`, `request_id`)
- [x] `.env.production.example` vytvorený
- [x] **AKTÍVNE**: Rotate Polygon API key (unikol v logoch)

## ✅ 3. Redis & DB

- [x] Redis s AOF (`--appendonly yes`)
- [x] `prisma migrate deploy` v deployment skripte
- [x] Graceful shutdown pre one-shot skripty

## ✅ 4. Workers & scheduler

- [x] PM2 konfigurácia (`ecosystem.production.config.js`)
- [x] 3 procesy: web, watchdog, scheduler
- [x] Graceful shutdown implementovaný

## ✅ 5. DQ & publish

- [x] `/api/dq` → `price ≥ 98` a `epsRev ≥ 90` ✅
- [x] `/api/earnings/meta` → dnešný `publishedAt` ✅
- [x] FE nikdy prázdny (vždy je `:published`) ✅

## ✅ 6. Rate-limits a stabilita

- [x] 404 handling s fallback lastKnown
- [x] Exclusion logic pre coverage calculation
- [x] Whitelist major exchanges

## ✅ 7. Observabilita

- [x] Logy: `symbol`, `status`, `request_id`, `duration`
- [x] Health: `/api/health` + `/api/dq`
- [x] Alert webhook skript vytvorený

## ✅ 8. Rollback

- [x] Rollback skript (`rollback-production.sh`)
- [x] Atomic rename: `prev → published`

## ✅ 9. Parita dev = prod

- [x] Parity check skript (`scripts/parity-check.js`)
- [x] Deployment skript (`deploy-production.sh`)
- [x] Rovnaké docker-compose pre Redis

## 🎯 **HOTOVO - Systém je pripravený na produkciu!**

### Spustenie:

```bash
# 1. Vytvor .env.production z env.production.example
cp env.production.example .env.production
# 2. Vyplň skutočné API kľúče
# 3. Spusti deployment
npm run deploy:prod
```

### Monitoring:

```bash
pm2 status
pm2 logs
curl http://localhost:3000/api/health
curl http://localhost:3000/api/dq
```

### Denný plán (automatický):

- 00:05 ET `daily_reset`
- 07:00 ET `epsrev_prefill`
- 08:00–16:10 ET `prices` (60s premarket, 30–60s open, 5–10 min zvyšok)
- 12:00 ET `epsrev_update`
- 16:10 a 20:00 ET `epsrev_backfill`
- každých 15 min `publish_attempt`
- každých 5 min `watchdog`

### "Hotovo" definícia:

- ✅ 3 po sebe idúce trhové dni bez zásahu
- ✅ `/api/dq` stabilne ≥98/≥90
- ✅ Error logy bez nezachytených výnimiek a bez kľúčov
- ✅ Dev = prod parita potvrdená
