# 🔍 Production Diagnostics Tools

Kompletná sada nástrojov na diagnostiku a riešenie problému "No Earnings Scheduled" na produkcii.

## 📦 Súbory v tomto balíku

| Súbor                                | Účel                              | Kedy použiť                                   |
| ------------------------------------ | --------------------------------- | --------------------------------------------- |
| **PRODUCTION-QUICK-FIX.md**          | 📘 Príručka s copy-paste príkazmi | Čítaj NAJPRV - obsahuje scenáre a quick fixes |
| **production-diagnostics-script.sh** | 🔍 Automatická diagnostika        | Spusti DRUHÝ - analyzuje celý systém          |
| **manual-fetch-production.sh**       | 🚀 Manuálny fetch dát             | Keď cron nezískal dnešné dáta                 |
| **quick-diagnose.js**                | ⚡ Node.js diagnostika DB         | Rýchla kontrola databázy (voliteľné)          |
| **check-database-manual.sql**        | 📊 SQL queries pre DB             | Manuálna kontrola dát (voliteľné)             |
| **PRODUCTION-DEBUG-GUIDE.md**        | 📚 Kompletný debug guide          | Podrobný návod (pre pokročilých)              |

---

## 🎯 Postup použitia (KROK ZA KROKOM)

### Krok 1: Priprav súbory na serveri

```bash
# 1. SSH na server
ssh root@89.185.250.213

# 2. Choď do projektu
cd /var/www/earnings-table

# 3. Pull nové diagnostické skripty (ak sú v Git)
git pull

# ALEBO nahraj súbory manuálne cez SCP/FTP:
# - production-diagnostics-script.sh
# - manual-fetch-production.sh
# - PRODUCTION-QUICK-FIX.md

# 4. Nastav execute práva
chmod +x production-diagnostics-script.sh
chmod +x manual-fetch-production.sh
```

### Krok 2: Spusti diagnostiku

```bash
cd /var/www/earnings-table
bash production-diagnostics-script.sh
```

**Výstup ti povie:**

- ✅ Je problém v DB, API, alebo FE?
- ⚠️ Timezone/UTC mismatch?
- ❌ Chýbajú dáta úplne?
- 🔧 Čo robiť ďalej

### Krok 3: Aplikuj fix podľa výstupu

Otvor **PRODUCTION-QUICK-FIX.md** a choď na príslušný **Scenár A/B/C/D**.

---

## 🚀 Quick Start (TL;DR)

Ak nemáš čas čítať, spusti toto:

```bash
ssh root@89.185.250.213
cd /var/www/earnings-table

# Diagnostika
bash production-diagnostics-script.sh

# Ak diagnostika ukáže problém, skús univerzálny fix:
pm2 restart all --update-env
curl -X POST http://127.0.0.1:3001/api/earnings/clear-cache
bash manual-fetch-production.sh
curl http://127.0.0.1:3001/api/earnings | head -c 500
```

---

## 📊 Ako interpretovať výstupy

### Output z `production-diagnostics-script.sh`:

#### ✅ Pozitívne znaky:

```
✅ Correct directory
✅ Database file exists
✅ Data exists for today
✅ API returns data (123 records)
```

→ **Problém je v browseri/cache**, spusti:

```bash
curl -X POST http://127.0.0.1:3001/api/earnings/clear-cache
```

#### ❌ Negatívne znaky:

```
❌ NO DATA FOR TODAY (2025-10-06)
Yesterday (2025-10-05): 145 records
Today (2025-10-06): 0 records
⚠️  WARNING: Data exists for adjacent dates but not today!
```

→ **Timezone problém**, spusti:

```bash
bash manual-fetch-production.sh
```

#### ⚠️ Warning znaky:

```
❌ API returns EMPTY data array!
Database HAS data for today
```

→ **DATABASE_URL mismatch**, spusti:

```bash
pm2 env earnings-table | grep DATABASE_URL
cat .env.production | grep DATABASE_URL
pm2 restart earnings-table --update-env
```

---

## 🔧 Nástroje podľa situácie

### Situácia 1: "Neviem, kde je problém"

```bash
bash production-diagnostics-script.sh
```

### Situácia 2: "Viem, že chýbajú dáta v DB"

```bash
bash manual-fetch-production.sh
```

### Situácia 3: "Dáta sú v DB, ale API ich nevracia"

```bash
pm2 restart earnings-table --update-env
curl -X POST http://127.0.0.1:3001/api/earnings/clear-cache
```

### Situácia 4: "API vracia dáta, ale frontend ich neukazuje"

```bash
curl -X POST http://127.0.0.1:3001/api/earnings/clear-cache
pm2 restart earnings-table
# Potom Ctrl+F5 v browseri
```

### Situácia 5: "Chcem vidieť DB priamo"

```bash
node quick-diagnose.js
# alebo
sqlite3 <DB_FILE> < check-database-manual.sql
```

---

## 📝 Časté problémy a riešenia

| Problém                                              | Príčina              | Riešenie                            |
| ---------------------------------------------------- | -------------------- | ----------------------------------- |
| `curl: (7) Failed to connect to localhost port 3000` | Zlý port             | Použi **port 3001**                 |
| `npm error enoent Could not read package.json`       | Zlý adresár          | `cd /var/www/earnings-table`        |
| `MODULE_NOT_FOUND: dotenv/config`                    | Chýbajú node_modules | `npm install`                       |
| `Use --update-env to update environment variables`   | ENV nerefreshol      | Pridaj `--update-env` k PM2 restart |
| API vracia `status: "no-data"`                       | Dáta nie sú v DB     | `bash manual-fetch-production.sh`   |
| Frontend ukazuje "No Earnings" ale API má dáta       | Cache                | Clear cache + Ctrl+F5               |

---

## 🎯 Checklist pre úspešný fix

- [ ] Som v `/var/www/earnings-table`
- [ ] PM2 procesy bežia (`pm2 list`)
- [ ] Používam port **3001** (nie 3000)
- [ ] Spustil som `production-diagnostics-script.sh`
- [ ] Prečítal som výstup sekcie "7. SUMMARY"
- [ ] Aplikoval som odporúčaný fix
- [ ] Clear cache: `curl -X POST http://127.0.0.1:3001/api/earnings/clear-cache`
- [ ] PM2 restart: `pm2 restart earnings-table --update-env`
- [ ] Test API: `curl http://127.0.0.1:3001/api/earnings`
- [ ] Test v browseri: www.earningstable.com (Ctrl+F5)

---

## 💡 Tips & Tricks

### Rychlé príkazy na zapamätanie:

```bash
# Diagnostika
cd /var/www/earnings-table && bash production-diagnostics-script.sh

# Reštart všetkého
pm2 restart all --update-env

# Clear cache
curl -X POST http://127.0.0.1:3001/api/earnings/clear-cache

# Test API
curl http://127.0.0.1:3001/api/earnings | head -c 500

# Manuálny fetch
bash manual-fetch-production.sh

# PM2 logy
pm2 logs earnings-cron --lines 100
```

### Aliasom na uľahčenie:

```bash
# Pridaj do ~/.bashrc
alias earnings-diag='cd /var/www/earnings-table && bash production-diagnostics-script.sh'
alias earnings-fetch='cd /var/www/earnings-table && bash manual-fetch-production.sh'
alias earnings-restart='pm2 restart all --update-env'
alias earnings-cache='curl -X POST http://127.0.0.1:3001/api/earnings/clear-cache'
alias earnings-test='curl http://127.0.0.1:3001/api/earnings | head -c 500'
```

Potom stačí:

```bash
earnings-diag
earnings-fetch
earnings-test
```

---

## 📞 Support

Ak žiadny z týchto nástrojov nepomohol:

1. Zbierz výstupy:

   ```bash
   bash production-diagnostics-script.sh > /tmp/diagnostics.txt 2>&1
   pm2 logs earnings-cron --lines 200 --nostream > /tmp/cron.txt 2>&1
   curl http://127.0.0.1:3001/api/earnings > /tmp/api.json 2>&1
   ```

2. Zdieľaj:

   - `/tmp/diagnostics.txt`
   - `/tmp/cron.txt`
   - `/tmp/api.json`

3. Uveď:
   - Dátum a čas problému
   - Ktoré kroky si už skúsil
   - Čo presne sa stalo

---

## ✅ Ako zistiť, že je problém vyriešený

Frontend (www.earningstable.com) ukazuje:

- ✅ Tabuľku s earnings (nie "No Earnings Scheduled")
- ✅ Štatistiky (Total earnings, With EPS, atď.)
- ✅ Dnešný dátum v hlavičke

API endpoint vracia:

```bash
$ curl http://127.0.0.1:3001/api/earnings | jq '.meta'
{
  "total": 123,  // > 0
  "date": "2025-10-06",  // dnešný dátum
  "fallbackUsed": false,
  "cached": false
}
```

PM2 logy neobsahujú errory:

```bash
$ pm2 logs earnings-cron --lines 50
# Vidíš "Unified data fetch completed successfully!"
# Vidíš "earningsCount: 123" (kde 123 > 0)
```

---

**Happy debugging! 🚀**
