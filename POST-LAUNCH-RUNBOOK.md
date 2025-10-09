# 🚀 Post-Launch Runbook

## Day-1/2 Smoke Test (3 príkazy)

```bash
# Quick health check
npm run smoke:test

# Manual checks
curl -s http://localhost:3000/api/health
curl -s http://localhost:3000/api/dq        # očakávaj price ≥ 98, epsRev ≥ 90
curl -s http://localhost:3000/api/earnings/meta
```

**Ak `publishedAt` ≠ dnešok → manuálne spusti:**

```bash
npm run process:prices && npm run process:epsrev && npm run publish:attempt
```

## PM2 Mini-Runbook

### Zobrazenie procesov/logov:

```bash
npm run pm2:runbook status
npm run pm2:runbook logs
```

### Reštart iba workerov:

```bash
npm run pm2:runbook restart-workers
```

### Reload webu bez výpadku:

```bash
npm run pm2:runbook reload-web
```

### Všetky PM2 príkazy:

```bash
npm run pm2:runbook <command>
# Commands: status, logs, restart-workers, reload-web, restart-all, stop-all, start-all, save, delete
```

## Incident "žiadny publish" (rýchly postup)

### Automatické riešenie:

```bash
npm run incident:response
```

### Manuálny postup:

1. `curl /api/dq` → zisti, ktorý coverage padá
2. **Ak price**: `npm run process:prices`
3. **Ak epsRev**: `npm run process:epsrev -- --mode=backfill`
4. **Vynúť publish**: `npm run publish:attempt`
5. **Stále nič?**: `npm run rollback:prod`

## Alerty (čo má pípnuť)

- `publishedAt` staršie než **60 min** (watchdog)
- `coverage.price < 90%` po 10:00 ET
- `coverage.epsRev < 70%` po 20:30 ET
- Neúspešný publish 3× po sebe

## Rate-limit a náklady (ochrana)

- **Concurrency**: 10–20
- **404**: neretryuj
- **5xx**: exponential backoff 1s→5s→15s
- **Soft cap**: max volaní/5 min
- **Logy**: nikdy netlač `apikey=` ✅

## Zálohy a obnova (raz v týždni over)

```bash
# Vytvor zálohy
npm run backup

# Test obnovy (manuálne)
# 1. Vytvor prázdnu DB
# 2. Restore z backup súboru
# 3. Over funkčnosť
```

## Stabilizačné SLO (ako si overíš "hotovo")

- **Dostupnosť publishu**: ≥ 1 publish/deň, 5 dní v rade
- **Coverage** pri publishi: price ≥ 98%, epsRev ≥ 90% (min. 95% dní v mesiaci)
- **MTTR incidentu**: < 30 min (vďaka runbooku)

## Monitoring Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# Data quality
curl http://localhost:3000/api/dq

# Publish metadata
curl http://localhost:3000/api/earnings/meta

# Earnings data
curl http://localhost:3000/api/earnings/today
```

## Mini-roadmap (po stabilizácii)

- **Schedule ingestion** (aby si mohol zdvihnúť `schedule ≥ 95%`)
- **BullMQ** (ak chceš horizontálne škálovanie)
- **Small caps politika**: osobitný zoznam pre OTC/illiquid
- **UI badge** pre `price_stale=true` a `actual_pending=true`

## Emergency Contacts

- **PM2 Status**: `pm2 status`
- **Logs**: `pm2 logs --lines 100`
- **Restart All**: `pm2 restart all`
- **Stop All**: `pm2 stop all`
- **Start All**: `pm2 start ecosystem.production.config.js`

## Quick Commands Reference

```bash
# Health & Status
npm run smoke:test
npm run pm2:runbook status

# Data Processing
npm run process:prices
npm run process:epsrev
npm run publish:attempt

# Incident Response
npm run incident:response
npm run rollback:prod

# Maintenance
npm run backup
npm run alert:check
npm run parity:check
```

---

**🎯 Systém je jednoduchý, prehľadný a spoľahlivý - pripravený na produkciu!**
