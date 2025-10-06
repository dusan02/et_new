# 🚑 Hotfix Summary - Cleanup Job Fix

## 🎯 Root Cause

Cleanup job (`clearOldData.ts`) mazal dnešné dáta (`gte: today`) bez následného fetch → prázdna DB → API vracia `no-data` → frontend zobrazuje "No Earnings Scheduled".

---

## ✅ Riešenie

### 1. Code Fix - `src/queue/jobs/clearOldData.ts`

**ULTRA-SHORT DIFF:**

```diff
- // 3. Reset current day data to ensure fresh start
- const resetTodayEarnings = await prisma.earningsTickersToday.deleteMany({
-   where: { reportDate: { gte: today } }
+ // 3. ✅ Safe cleanup: delete ONLY older data (not today)
+ const cleanupYesterdayEarnings = await prisma.earningsTickersToday.deleteMany({
+   where: { reportDate: { lt: today } }

- const resetTodayMarket = await prisma.todayEarningsMovements.deleteMany({
-   where: { reportDate: { gte: today } }
+ const cleanupYesterdayMarket = await prisma.todayEarningsMovements.deleteMany({
+   where: { reportDate: { lt: today } }

- console.log(`   - Reset today's earnings: ${resetTodayEarnings.count}`)
+ console.log(`   - Yesterday earnings: ${cleanupYesterdayEarnings.count}`)
+ console.log(`   ✅ Today's data PRESERVED (not deleted)`)
```

**Efekt:** Cleanup maže LEN staršie ako dnes, nikdy dnešné dáta.

---

### 2. Nové pomocné skripty

| Skript                           | Účel                                         |
| -------------------------------- | -------------------------------------------- |
| `immediate-data-restore.sh`      | Okamžité obnovenie dát (restart cron + test) |
| `manual-fetch-fallback.sh`       | Manuálny fetch ako záloha                    |
| `post-hotfix-check.sh`           | Validácia po hotfixe                         |
| `pm2-start.sh`                   | PM2 wrapper pre správne ENV loading          |
| `cleanup-crlf.sh`                | Odstránenie Windows line endings             |
| `ecosystem.production.config.js` | PM2 config s proper ENV                      |

---

### 3. PM2 ENV Fix

**Problém:** `DATABASE_URL` nebol viditeľný v PM2 procesoch

**Riešenie:**

- `ecosystem.production.config.js` - definuje ENV pre oba procesy
- `pm2-start.sh` - wrapper načíta `.env.production` pred PM2 start

---

## 📦 Nasadenie (na produkčnom serveri)

```bash
# SSH do servera
ssh root@your-server
cd /var/www/earnings-table

# Pull changes
git pull origin main

# Spusti deployment
chmod +x *.sh
./cleanup-crlf.sh          # Jednorazovo
./immediate-data-restore.sh # Obnoví dáta
./post-hotfix-check.sh     # Validácia
```

---

## 🧪 Validácia

### 1. API test

```bash
curl -s "http://127.0.0.1:3001/api/earnings?nocache=1" | head -c 300
```

**Očakávaš:** `{"status":"ok","data":[...`

### 2. Website

https://www.earningstable.com → tabuľka s dnešnými earnings

### 3. Logy

```bash
pm2 logs earnings-cron --lines 50 | grep "PRESERVED"
```

**Očakávaš:** `✅ Today's data PRESERVED (not deleted)`

---

## 🛡️ Prevencia

### Budúce PM2 reštarty

**Namiesto:**

```bash
pm2 restart all
```

**Použi:**

```bash
./pm2-start.sh
```

**Prečo:** Správne načíta `.env.production` do oboch procesov.

---

## 📊 Zmeny v logoch

### Pred hotfixom

```
🔄 Resetting current day data for 2025-10-06
   - Reset today's earnings: 19
   - Reset today's market data: 12
```

### Po hotfixe

```
✅ Preserving today's data: 2025-10-06
   - Old earnings (>7d): 0
   - Yesterday earnings: 3
   ✅ Today's data PRESERVED (not deleted)
```

---

## 🔍 Dodatočné opravy (voliteľné)

### Polygon 404 spam

Viď: `POLYGON-404-FIX-EXAMPLE.md`

**Quick fix:**

```typescript
} catch (err) {
  if (err?.response?.status === 404) {
    console.warn(`[polygon] 404 ${ticker} - using fallback`)
    return null
  }
  throw err
}
```

---

## 📞 Support

Ak problém pretrváva, pošli:

1. `pm2 logs earnings-cron --lines 200 --nostream`
2. `curl -s "http://127.0.0.1:3001/api/earnings?nocache=1"`
3. `pm2 status`
4. Output z `./post-hotfix-check.sh`

---

## ✨ Zhrnutie zmien v repo

**Modified:**

- `src/queue/jobs/clearOldData.ts` - Safe cleanup (lt: today)

**New:**

- `immediate-data-restore.sh`
- `manual-fetch-fallback.sh`
- `post-hotfix-check.sh`
- `pm2-start.sh`
- `cleanup-crlf.sh`
- `ecosystem.production.config.js`
- `HOTFIX-DEPLOYMENT-GUIDE.md`
- `DEPLOY-CHECKLIST.md`
- `POLYGON-404-FIX-EXAMPLE.md`
- `HOTFIX-SUMMARY.md` (tento súbor)

**Ready to commit:** ✅
