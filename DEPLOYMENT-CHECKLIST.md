# 🔒 DEPLOYMENT CHECKLIST - 1:1 PARITY

## ⚠️ **KRITICKÉ: Pred deployom**

### 1. **API Kľúče (IHNEĎ!)**
- [ ] **ROTÁCIA API KĽÚČOV** - boli zverejnené v predchádzajúcom výstupe
- [ ] Polygon API: `Vi_pMLcusE8RA_SUvkPAmiyziVzlmOoX` → **NOVÝ KĽÚČ**
- [ ] Finnhub API: `d28f1dhr01qjsuf342ogd28f1dhr01qjsuf342p0` → **NOVÝ KĽÚČ**

### 2. **Verzie zamrznuté**
- [ ] `package.json` - všetky závislosti bez `^`/`~`
- [ ] `package-lock.json` commitnutý do repa
- [ ] Na serveri používať `npm ci` namiesto `npm install`

---

## 🚀 **Deployment Process (1:1 s localhost)**

### **Lokálne (vzorka):**
```bash
# 1. Cleanup
rm -rf .next node_modules

# 2. Install
npm ci

# 3. Build
npm run build

# 4. Start
npm start
```

### **Server (rovnaká sekvencia):**
```bash
# 1. Cleanup
rm -rf .next node_modules

# 2. Install
npm ci

# 3. Build (s parity check)
npm run build

# 4. PM2 start
pm2 start ecosystem.config.js
```

---

## 🔍 **Environment Variables (1:1 parity)**

### **Lokálne (.env):**
```bash
NODE_ENV=development
DATABASE_URL="file:./prisma/dev.db"
REDIS_URL="redis://localhost:6379"
POLYGON_API_KEY="[NOVÝ_KĽÚČ]"
FINNHUB_API_KEY="[NOVÝ_KĽÚČ]"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### **Produkcia (.env):**
```bash
NODE_ENV=production
DATABASE_URL="file:./prisma/dev.db"  # ROVNAKÝ názov súboru!
REDIS_URL="redis://localhost:6379"
POLYGON_API_KEY="[NOVÝ_KĽÚČ]"
FINNHUB_API_KEY="[NOVÝ_KĽÚČ]"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

**⚠️ KRITICKÉ:** `DATABASE_URL` používa `dev.db` aj v produkcii pre 1:1 parity!

---

## ✅ **Post-Deployment Verification**

### **1. Health Checks:**
```bash
# Skontroluj procesy
pm2 status

# Skontroluj porty
netstat -tlnp | grep :3000

# Skontroluj API
curl http://localhost:3000/api/earnings
curl http://localhost:3000/api/earnings/stats
```

### **2. Database Verification:**
```bash
# Skontroluj databázu
ls -la prisma/
npx prisma studio
```

### **3. Cron Jobs Verification:**
```bash
# Skontroluj PM2 logy
pm2 logs earnings-cron

# Skontroluj cron výstup
tail -f logs/cron-combined.log
```

### **4. API Response Verification:**
```bash
# Skontroluj response format
curl -s http://localhost:3000/api/earnings | jq '.data[0]'
# Malo by vrátiť rovnaký formát ako localhost
```

---

## 🧱 **Parity Scripts**

### **Vytvor snapshots z localhost:**
```bash
npm run snapshot:create
```

### **Porovnaj s produkciou:**
```bash
npm run snapshot:compare https://your-domain.com
```

---

## 🚫 **Anti-Mutation Rules**

### **❌ NEDEĽAJ:**
- [ ] Zmeny názvov súborov DB (`dev.db` → `prod.db`)
- [ ] Nové skripty v `package.json` (`build:production`)
- [ ] Zmeny cron plánov
- [ ] Zmeny import ciest (`@/modules/shared` → `../../../`)
- [ ] Docker pokusy (používame PM2)
- [ ] Nginx optimalizácie bez schválenia

### **✅ DEĽAJ:**
- [ ] Používaj `NODE_ENV=production` v produkcii
- [ ] Používaj `dev.db` databázu aj v produkcii
- [ ] Používaj PM2 pre process management
- [ ] Používaj `@/modules/shared` importy
- [ ] Validuj environment variables

---

## 🧯 **Rollback (30 sekúnd)**

```bash
# Ak sa niečo líši, okamžite:
pm2 logs earnings-table --lines 200
pm2 restart earnings-table

# Alebo rollback na predchádzajúci balík
pm2 stop earnings-table
pm2 start ecosystem.config.js
```

---

## 🎯 **Success Criteria**

- [ ] **HTTP 200** na `https://your-domain.com`
- [ ] **API endpoints** vracajú rovnaké dáta ako localhost
- [ ] **Cron jobs** bežia bez chýb
- [ ] **Database** obsahuje aktuálne dáta
- [ ] **Price changes** nie sú všetky 0% (ak sú dostupné dáta)
- [ ] **PM2 status** ukazuje running procesy
- [ ] **Nginx** proxy funguje správne

**Tento checklist zabezpečí 1:1 migráciu localhost → production!** 🚀
