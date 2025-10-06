# 🎯 Immediate Action Plan

## ✅ Hotfix je pripravený v repo!

Všetky zmeny sú hotové a pripravené na commit + deployment.

---

## 📋 Čo urobiť TERAZ (krok po kroku)

### 1. Commit & Push (z lokálneho Windows)

```powershell
# V Cursor terminali (PowerShell)
cd D:\Projects\EarningsTableUbuntu

git add .
git commit -F COMMIT-MESSAGE.txt
git push origin main
```

---

### 2. Deployment na produkcii (SSH)

```bash
# Pripoj sa na server
ssh root@your-server

# Prejdi do projektu
cd /var/www/earnings-table

# Pull zmeny
git pull origin main

# Sprav všetky skripty spustiteľné
chmod +x *.sh

# KROK 1: Cleanup CRLF (jednorazovo)
./cleanup-crlf.sh

# KROK 2: Okamžité obnovenie dát
./immediate-data-restore.sh
```

**Po `immediate-data-restore.sh` sleduj výstup:**

- ✅ Hľadaj: `Saved X earnings to database`
- ✅ API test: `{"status":"ok","data":[...`

**Ak vidíš `"status":"no-data"`:**

```bash
./manual-fetch-fallback.sh
```

---

### 3. Validácia

```bash
# Spusti kompletný check
./post-hotfix-check.sh
```

**Očakávaný výstup:**

- ✅ Build úspešný
- ✅ PM2 procesy running
- ✅ Logy: "Today's data PRESERVED"
- ✅ API: `{"status":"ok",...`
- ✅ DB má dnešné záznamy

---

### 4. Website test

Otvor: **https://www.earningstable.com**

**Očakávaš:**

- ✅ Tabuľka s dnešnými earnings
- ✅ Stats cards so správnymi číslami

**Ak vidíš "No Earnings Scheduled":**

- Počkaj 2-3 minúty (cache expiration)
- Alebo manuálne clear cache:
  ```bash
  curl -X POST http://127.0.0.1:3001/api/earnings/clear-cache
  ```

---

## 🎉 Hotové!

Ak všetko funguje:

1. ✅ Dáta sa zobrazujú na stránke
2. ✅ API vracia `status: "ok"`
3. ✅ Logy ukazujú "PRESERVED"

→ **Hotfix je úspešne nasadený!**

---

## 🛡️ Budúce použitie

**Namiesto `pm2 restart` používaj:**

```bash
cd /var/www/earnings-table
./pm2-start.sh
```

**Prečo:** Správne načíta `.env.production` do oboch procesov.

---

## 📊 Monitoring (prvých 24h)

```bash
# Live logs
pm2 logs

# Check každú hodinu
pm2 logs earnings-cron --lines 50 | grep "PRESERVED\|Saved.*earnings"
```

**Hľadaj:**

- ✅ `✅ Today's data PRESERVED (not deleted)`
- ✅ `Saved X earnings to database`
- ❌ **NEmalo by byť:** `Reset today's earnings: X`

---

## 🆘 Troubleshooting

### Problem: API stále vracia "no-data"

```bash
# 1. Check DB
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM EarningsTickersToday WHERE date(reportDate) = date('now');"

# 2. Ak je 0, manual fetch
./manual-fetch-fallback.sh

# 3. Clear cache a restart
curl -X POST http://127.0.0.1:3001/api/earnings/clear-cache
pm2 restart earnings-table
```

### Problem: Polygon 404 spam v logoch

- **Normal behavior** pre niektoré ticker-y
- Fetch pokračuje s fallback hodnotami
- Voliteľne: Viď `POLYGON-404-FIX-EXAMPLE.md`

### Problem: ENV nie je viditeľné v PM2

```bash
./pm2-start.sh
pm2 status
pm2 env 0  # Check earnings-table ENV
pm2 env 1  # Check earnings-cron ENV
```

---

## 📞 Ak potrebuješ pomoc

Pošli mi:

1. `pm2 logs earnings-cron --lines 200 --nostream > cron-logs.txt`
2. `pm2 logs earnings-table --lines 100 --nostream > app-logs.txt`
3. `curl -s "http://127.0.0.1:3001/api/earnings?nocache=1" > api-response.json`
4. `pm2 status`

---

## 📚 Dokumentácia

- **Quick start:** `DEPLOY-CHECKLIST.md`
- **Kompletný guide:** `HOTFIX-DEPLOYMENT-GUIDE.md`
- **Súhrn zmien:** `HOTFIX-SUMMARY.md`
- **Polygon fix:** `POLYGON-404-FIX-EXAMPLE.md`

---

## 🚀 Go!

```bash
# Windows (commit)
git add . && git commit -F COMMIT-MESSAGE.txt && git push origin main

# Linux server (deployment)
ssh root@your-server
cd /var/www/earnings-table
git pull origin main
chmod +x *.sh
./cleanup-crlf.sh
./immediate-data-restore.sh
./post-hotfix-check.sh
```

**Hotové za ~5 minút!** 🎉
