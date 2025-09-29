# 🛡️ RECOVERY INSTRUCTIONS - Obnovenie stabilnej verzie

## 🎯 ZLATÁ ZÁLOHA: v1.0-stable

**Vytvorený:** 27.09.2025  
**Commit:** 1097aa9  
**Stav:** Plne funkčný - localhost:3000, produkcia, Change hodnoty, Polygon API

---

## 🚨 KDY POUŽIŤ RECOVERY:

- Prestanú fungovať Change hodnoty (zobrazujú sa 0%)
- Polygon API vracia 403 chyby
- Localhost:3000 nefunguje
- Cron worker prestane sťahovať dáta
- Nový kód niečo pokazil

---

## 🔄 NÁVRAT NA STABILNÚ VERZIU:

### 1️⃣ LOCALHOST RECOVERY:

```bash
# V D:\Projects\EarningsTableUbuntu\
git fetch --tags
git checkout v1.0-stable
npm ci
npm run build
npm run dev
```

### 2️⃣ PRODUCTION RECOVERY (89.185.250.213):

```bash
ssh root@89.185.250.213
# Heslo: EJXTfBOG2t

cd /var/www/earnings-table
git fetch --tags
git checkout v1.0-stable
docker-compose -f deployment/docker-compose.yml down
docker-compose -f deployment/docker-compose.yml build --no-cache app
docker-compose -f deployment/docker-compose.yml up -d
```

### 3️⃣ PRODUCTION RECOVERY (earningstable.com):

```bash
ssh root@earningstable.com
# Heslo: EJXTfBOG2t

cd /var/www/earnings-table
git fetch --tags
git checkout v1.0-stable
docker-compose -f deployment/docker-compose.yml down
docker-compose -f deployment/docker-compose.yml build --no-cache app
docker-compose -f deployment/docker-compose.yml up -d
```

---

## ✅ ČO TÁTO VERZIA OBSAHUJE:

- **✅ Polygon API fix:** Používa `/v2/snapshot` endpoint (kompatibilný s $29 Starter plánom)
- **✅ Change hodnoty:** Skutočné percentá namiesto 0%
- **✅ Cron worker:** Správne načítava .env z root adresára
- **✅ Database sync:** localhost a produkcia zdieľajú rovnaké dáta
- **✅ Error handling:** 403 chyby vyriešené

---

## 🧪 TEST PO RECOVERY:

1. **API Test:**

   ```bash
   curl http://localhost:3000/api/earnings
   ```

2. **Change hodnoty:** Otvorte localhost:3000, skontrolujte že Change column má percentá

3. **Cron worker:** Skontrolujte že beží a sťahuje dáta

---

## 📋 BACKUP FILES (ak treba):

- `src/jobs/fetch-today.ts` - Polygon API logika
- `src/queue/worker-new.js` - Cron worker s .env fix
- `.env` - Environment variables
- `deploy-manual-instructions.md` - Deployment návod

---

## 🆘 V PRÍPADE NÚDZE:

**Commit hash na obnovenie:** `1097aa9`

```bash
git reset --hard 1097aa9
```

---

**🎯 ZÁLOŽNÁ VERZIA JE KONZEROVANÁ A CHRÁNENÁ!** 🛡️

