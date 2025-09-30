# 🚨 CRON JOBS FIX GUIDE - PRODUCTION DEPLOYMENT

## ❌ **PROBLÉMY KTORÉ BOLI NÁJDENÉ:**

### 1. **CHÝBAJÚCI SÚBOR `simple-cron.js`**

- ❌ Súbor `scripts/simple-cron.js` neexistoval
- ❌ Docker compose sa pokúšal spustiť neexistujúci súbor
- ❌ PM2 sa pokúšal spustiť `npm run cron` ktorý volal neexistujúci súbor

### 2. **NESPRÁVNE CESTY V ECOSYSTEM.CONFIG.JS**

- ❌ Všetky cesty boli nastavené na placeholder `/path/to/your/app`
- ❌ PM2 nevedel nájsť aplikáciu

### 3. **NEKONZISTENTNÉ KONFIGURÁCIE**

- ❌ Rôzne docker-compose súbory mali rôzne commandy
- ❌ Hlavný používal `src/queue/worker-new.js`
- ❌ Et_new používal `scripts/simple-cron.js` (ktorý neexistoval)

## ✅ **RIEŠENIA KTORÉ BOLI IMPLEMENTOVANÉ:**

### 1. **VYTVORENÝ SÚBOR `scripts/simple-cron.js`**

```javascript
// Nový súbor s kompletnou cron konfiguráciou
// - Main fetch: Daily at 2:00 AM NY time
// - Market updates: Every 2 minutes during market hours
// - Pre-market: Every 5 minutes (4:00 AM - 9:30 AM ET)
// - After-hours: Every 10 minutes (4:00 PM - 8:00 PM ET)
// - Weekend: Every hour
```

### 2. **OPRAVENÉ CESTY V ECOSYSTEM.CONFIG.JS**

```javascript
// Zmenené z:
cwd: '/path/to/your/app', // Update this path

// Na:
cwd: process.cwd(),
```

### 3. **VYTVORENÉ SÚBORY V OBOCH ADRESÁROCH**

- ✅ `scripts/simple-cron.js` (hlavný adresár)
- ✅ `et_new/scripts/simple-cron.js` (et_new adresár)

## 🚀 **DEPLOYMENT INŠTRUKCIE PRE PRODUKCIU:**

### **KROK 1: SSH na server**

```bash
ssh root@89.185.250.213
```

### **KROK 2: Zastaviť existujúce procesy**

```bash
# Zastaviť PM2 procesy
pm2 stop all
pm2 delete all

# Zastaviť Docker kontajnery
docker stop earnings-app earnings-cron 2>/dev/null || true
docker rm earnings-app earnings-cron 2>/dev/null || true
```

### **KROK 3: Aktualizovať kód**

```bash
# Prejsť do adresára aplikácie
cd /opt/earnings-table

# Stiahnuť najnovšie zmeny
git pull origin main

# Alebo ak používate et_new:
cd /opt/et_new
git pull origin main
```

### **KROK 4: Overiť nové súbory**

```bash
# Skontrolovať či existuje simple-cron.js
ls -la scripts/simple-cron.js

# Skontrolovať ecosystem.config.js
cat ecosystem.config.js | grep cwd
```

### **KROK 5: Reštartovať aplikáciu**

#### **MOŽNOSŤ A: PM2 (Odporúčané)**

```bash
# Nainštalovať závislosti
npm ci --production

# Spustiť PM2 s novou konfiguráciou
pm2 start ecosystem.config.js --env production

# Uložiť PM2 konfiguráciu
pm2 save
pm2 startup

# Skontrolovať status
pm2 status
pm2 logs earningstable-cron
```

#### **MOŽNOSŤ B: Docker**

```bash
# Rebuild a spustiť Docker kontajnery
docker-compose down
docker-compose up -d

# Skontrolovať logy
docker logs earnings-cron
```

### **KROK 6: Overiť funkčnosť**

```bash
# Skontrolovať PM2 procesy
pm2 status

# Skontrolovať logy cron jobu
pm2 logs earningstable-cron --lines 50

# Skontrolovať Docker logy (ak používate Docker)
docker logs earnings-cron --tail 50

# Testovať manuálne spustenie
npm run cron
```

## 🔍 **MONITORING A TROUBLESHOOTING:**

### **Skontrolovať logy:**

```bash
# PM2 logy
pm2 logs earningstable-cron

# Docker logy
docker logs earnings-cron

# Systémové logy
journalctl -u pm2-root -f
```

### **Testovať cron joby:**

```bash
# Manuálne spustenie
npm run cron

# Test fetch scriptu
npm run fetch:data

# Skontrolovať časové pásmo
date
timedatectl
```

### **Časté problémy:**

1. **"Cannot find module"** - Skontrolovať či sú nainštalované závislosti
2. **"Permission denied"** - Skontrolovať oprávnenia súborov
3. **"Port already in use"** - Zastaviť existujúce procesy
4. **"Database connection failed"** - Skontrolovať DATABASE_URL

## 📊 **OČAKÁVANÉ VÝSTUPY:**

Po úspešnom nasadení by ste mali vidieť:

```
🚀 Starting Simple Cron Worker with NY Timezone...
🔄 Running initial data fetch...
📊 Initial startup fetch output: [fetch data]
✅ Initial startup fetch completed with code 0
✅ Simple cron worker started successfully!
📅 Schedule:
  - Main fetch: Daily at 2:00 AM NY time
  - Market updates: Every 2 minutes during market hours (9:30 AM - 4:00 PM ET)
  - Pre-market: Every 5 minutes (4:00 AM - 9:30 AM ET)
  - After-hours: Every 10 minutes (4:00 PM - 8:00 PM ET)
  - Weekend: Every hour
🕐 Current NY time: [current time]
```

## 🎯 **ZÁVEREČNÉ KROKY:**

1. ✅ Vytvorené chýbajúce súbory
2. ✅ Opravené cesty v konfigurácii
3. ✅ Synchronizované konfigurácie
4. 🔄 **DEPLOY NA PRODUKCIU** (potrebné vykonať)
5. 🔄 **MONITORING** (sledovať logy)

---

**DÔLEŽITÉ:** Po nasadení týchto zmien by cron joby mali fungovať správne. Sledujte logy prvých pár hodín aby ste sa uistili, že všetko beží ako má.
