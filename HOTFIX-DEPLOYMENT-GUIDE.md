# 🚑 Hotfix Deployment Guide

## Problém

Cleanup job maže dnešné dáta bez následného fetch → DB prázdna → "No Earnings Scheduled"

## Riešenie

1. Okamžité obnovenie dát
2. Code hotfix - nemaže dnešné dáta
3. PM2 ENV fix - správne načítanie environment variables

---

## 📋 Kroky nasadenia (spusti na produkčnom serveri)

### 1. Pripoj sa na server

```bash
ssh root@your-server
cd /var/www/earnings-table
```

### 2. Stiahni najnovšie zmeny

```bash
git pull origin main
```

### 3. Cleanup CRLF (jednorazovo)

```bash
chmod +x cleanup-crlf.sh
./cleanup-crlf.sh
```

### 4. Okamžité obnovenie dát

```bash
chmod +x immediate-data-restore.sh
./immediate-data-restore.sh
```

**Ak cron nereaguje**, použi fallback:

```bash
chmod +x manual-fetch-fallback.sh
./manual-fetch-fallback.sh
```

### 5. Post-hotfix validácia

```bash
chmod +x post-hotfix-check.sh
./post-hotfix-check.sh
```

---

## 🔧 Čo bolo zmenené

### `src/queue/jobs/clearOldData.ts`

- ❌ **Pred**: `gte: today` - mazal dnešné dáta
- ✅ **Po**: `lt: today` - maže LEN staršie dáta

### Nové súbory

- `ecosystem.production.config.js` - PM2 config s proper ENV
- `pm2-start.sh` - Wrapper pre správne načítanie `.env.production`
- `immediate-data-restore.sh` - Okamžité obnovenie dát
- `manual-fetch-fallback.sh` - Manuálny fetch ako záloha
- `post-hotfix-check.sh` - Validácia po hotfixe
- `cleanup-crlf.sh` - Odstránenie Windows line endings

---

## 🎯 Overenie úspešnosti

### API test

```bash
curl -s "http://127.0.0.1:3001/api/earnings?nocache=1" | head -c 500
```

**Očakávaný output:**

```json
{"status":"ok","data":[...
```

❌ **Ak vidíš:**

```json
{"status":"no-data",...
```

→ Spusti `manual-fetch-fallback.sh`

### Website test

Otvor: https://www.earningstable.com

- ✅ Mala by sa zobraziť tabuľka s dnešnými earnings
- ❌ Ak vidíš "No Earnings Scheduled", počkaj 2-3 minúty (cache expiration)

### PM2 logs

```bash
pm2 logs earnings-cron --lines 50
```

**Hľadaj:**

- ✅ `Saved X earnings to database`
- ✅ `✅ Today's data PRESERVED (not deleted)`
- ❌ `Reset today's earnings: X` (toto by sa už nemalo vyskytovať)

---

## 🛡️ Prevencia do budúcna

### Použite nový PM2 startup

Namiesto `pm2 restart`, používaj wrapper:

```bash
chmod +x pm2-start.sh
./pm2-start.sh
```

**Výhody:**

- Správne načítanie `.env.production`
- Konzistentné ENV pre oba procesy (app + cron)
- Persist konfigurácia cez `pm2 save`

### Monitoring

```bash
# Kontrola PM2 status
pm2 status

# Live logs
pm2 logs

# ENV check
pm2 env 0  # earnings-table
pm2 env 1  # earnings-cron
```

---

## 🆘 Troubleshooting

### "No data" napriek fetch

```bash
# Clear cache
curl -X POST http://127.0.0.1:3001/api/earnings/clear-cache

# Restart app
pm2 restart earnings-table
```

### Polygon 404 spam v logoch

Normal behavior pre niektoré ticker-y (ACCD, UBX, MAQC, TLCC).
Fetch pokračuje s fallback hodnotami.

### DATABASE_URL nie je viditeľné v PM2

```bash
# Reštartni cez wrapper
./pm2-start.sh

# Alebo manuálne načítaj ENV
set -a; source <(tr -d '\r' < .env.production); set +a
pm2 restart all --update-env
```

---

## 📞 Support checklist

Ak problém pretrváva, pošli:

1. `pm2 logs earnings-cron --lines 200 --nostream`
2. `pm2 logs earnings-table --lines 100 --nostream`
3. `curl -s "http://127.0.0.1:3001/api/earnings?nocache=1" | head -c 1000`
4. `pm2 status`
5. Output z `./post-hotfix-check.sh`
