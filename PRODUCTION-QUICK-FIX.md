# ⚡ Production Quick Fix Guide

**Problem:** "No Earnings Scheduled" na www.earningstable.com (Monday, Oct 6, 2025)

## 🎯 Najrýchlejší postup (copy-paste)

```bash
# 1. SSH na server
ssh root@89.185.250.213

# 2. Choď do projektu
cd /var/www/earnings-table

# 3. Spusti diagnostiku
bash production-diagnostics-script.sh

# Počkaj na výstup a pozri sa na sekciu "7. SUMMARY & RECOMMENDATIONS"
```

---

## 📊 Interpretácia výsledkov

### Scenár A: ✅ "STATUS: HEALTHY"

- Dáta sú v DB, API ich vracia
- **Problém je v browseri/cache**
- **Fix:**
  ```bash
  curl -X POST http://127.0.0.1:3001/api/earnings/clear-cache
  pm2 restart earnings-table --update-env
  ```
  Potom refresh browser (Ctrl+F5)

### Scenár B: ⚠️ "STATUS: API ISSUE"

- Dáta SÚ v DB, ale API vracia prázdno
- **Problém: zlá DATABASE_URL v PM2**
- **Fix:**

  ```bash
  # Skontroluj DATABASE_URL
  pm2 env earnings-table | grep DATABASE_URL
  cat .env.production | grep DATABASE_URL

  # Ak nesedí, oprav .env.production a:
  pm2 restart earnings-table --update-env
  pm2 restart earnings-cron --update-env

  # Clear cache
  curl -X POST http://127.0.0.1:3001/api/earnings/clear-cache

  # Test API
  curl http://127.0.0.1:3001/api/earnings | head -c 500
  ```

### Scenár C: 🔄 "TIMEZONE/UTC WINDOW PROBLEM"

- Data existujú pre včera/zajtra, ale nie pre dnes
- **Problém: cron fetchuje pre zlý deň**
- **Fix:**

  ```bash
  # Manuálny fetch pre dnes (UTC)
  cd /var/www/earnings-table
  DATE=$(date -u +"%Y-%m-%d") npm run fetch:data

  # Alebo použiť skript:
  bash manual-fetch-production.sh

  # Počkaj 1-2 min, potom clear cache
  curl -X POST http://127.0.0.1:3001/api/earnings/clear-cache

  # Test
  curl http://127.0.0.1:3001/api/earnings | head -c 500
  ```

### Scenár D: ❌ "NO DATA IN DATABASE"

- Žiadne dáta v DB pre žiadny deň
- **Problém: cron job nebeží alebo API keys neplatné**
- **Fix:**

  ```bash
  # Skontroluj cron logy
  pm2 logs earnings-cron --lines 200

  # Reštartuj cron
  pm2 restart earnings-cron --update-env

  # Alebo manuálny fetch
  bash manual-fetch-production.sh
  ```

---

## 🔧 Univerzálny Quick Fix (skús najprv)

```bash
cd /var/www/earnings-table

# 1. Reštartuj všetko s aktuálnymi ENV
pm2 restart earnings-table --update-env
pm2 restart earnings-cron --update-env

# 2. Clear cache
curl -X POST http://127.0.0.1:3001/api/earnings/clear-cache

# 3. Počkaj 10 sekúnd
sleep 10

# 4. Test API
curl http://127.0.0.1:3001/api/earnings | head -c 500

# 5. Ak stále prázdne, manuálny fetch
bash manual-fetch-production.sh

# 6. Znova clear cache
curl -X POST http://127.0.0.1:3001/api/earnings/clear-cache

# 7. Final test
curl http://127.0.0.1:3001/api/earnings | head -c 500
```

---

## 🐛 Debug špecifických problémov

### Problém: "curl: (7) Failed to connect to localhost port 3000"

**Chyba:** Používaš zlý port
**Fix:** Používaj port **3001** namiesto 3000

```bash
# Správne:
curl http://127.0.0.1:3001/api/earnings

# Alebo cez doménu:
curl https://www.earningstable.com/api/earnings
```

### Problém: "MODULE_NOT_FOUND: dotenv/config"

**Chyba:** Spúšťaš node mimo projektu
**Fix:** Vždy najprv `cd /var/www/earnings-table`

```bash
cd /var/www/earnings-table
npm run fetch:data
```

### Problém: "Use --update-env to update environment variables"

**Chyba:** PM2 nerefreshol ENV po zmene .env.production
**Fix:** Pridaj `--update-env`

```bash
pm2 restart earnings-table --update-env
pm2 restart earnings-cron --update-env
```

### Problém: API vracia dáta, ale frontend ukazuje "No Earnings"

**Chyba:** Browser cache alebo stale Next.js cache
**Fix:**

```bash
# 1. Clear server cache
curl -X POST http://127.0.0.1:3001/api/earnings/clear-cache

# 2. Hard refresh browser (Ctrl+Shift+R alebo Ctrl+F5)

# 3. Skús incognito mode

# 4. Ak stále nič, reštartuj Next.js
pm2 restart earnings-table --update-env
```

---

## 📝 Checklist pred eskáláciou

Pred tým, ako to vyhlásíš za "bug v kóde", over:

- [ ] Si v správnom adresári: `/var/www/earnings-table`
- [ ] Používaš port **3001** (nie 3000)
- [ ] PM2 procesy bežia: `pm2 list` (earnings-table + earnings-cron = online)
- [ ] DATABASE_URL je správna: `pm2 env earnings-table | grep DATABASE_URL`
- [ ] API endpoint odpovedá: `curl http://127.0.0.1:3001/api/earnings`
- [ ] DB obsahuje dáta: `bash production-diagnostics-script.sh` (pozri sekciu 6)
- [ ] Cache je vyprázdnená: `curl -X POST http://127.0.0.1:3001/api/earnings/clear-cache`
- [ ] PM2 restart s `--update-env`

---

## 🎯 Očakávaný výsledok

Po úspešnom fixe by si mal vidieť:

```bash
$ curl http://127.0.0.1:3001/api/earnings | head -c 500

{"status":"ok","data":[{"ticker":"AAPL","reportTime":"AMC","epsActual":null,"epsEstimate":1.23,...}],"meta":{"total":123,"duration":"45ms","date":"2025-10-06",...}}
```

A na stránke www.earningstable.com miesto "No Earnings Scheduled" uvidíš tabuľku s earnings.

---

## 📞 Ak nič nepomohlo

Zbierz diagnostické info:

```bash
cd /var/www/earnings-table

# Full diagnostics
bash production-diagnostics-script.sh > /tmp/diagnostics.txt 2>&1

# PM2 logs
pm2 logs earnings-cron --lines 200 --nostream > /tmp/cron-logs.txt 2>&1
pm2 logs earnings-table --lines 100 --nostream > /tmp/app-logs.txt 2>&1

# API response
curl http://127.0.0.1:3001/api/earnings > /tmp/api-response.json 2>&1

# Database query
sqlite3 <DATABASE_FILE> "SELECT DATE(reportDate), COUNT(*) FROM EarningsTickersToday GROUP BY DATE(reportDate) ORDER BY DATE(reportDate) DESC LIMIT 10;" > /tmp/db-dates.txt 2>&1

# Zozbieraj súbory
cat /tmp/diagnostics.txt
cat /tmp/cron-logs.txt
cat /tmp/api-response.json
cat /tmp/db-dates.txt
```

A zdieľaj tieto výstupy pre ďalšiu analýzu.
